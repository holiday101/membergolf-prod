import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { publicFetch } from "../api/public";

type MoneyRow = {
  member_id: number;
  firstname: string | null;
  lastname: string | null;
  total_amount: number | null;
};

export default function PublicMoneyListPage() {
  const { courseId } = useParams();
  const [rows, setRows] = useState<MoneyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const yearParam = selectedYear === "all" ? "" : `?year=${selectedYear}`;
        const data = await publicFetch<MoneyRow[]>(
          `/public/${courseId}/moneylist${yearParam}`
        );
        setRows(data);
      } catch (e: any) {
        setError(e.message ?? "Failed to load money list");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [courseId, selectedYear]);

  const filteredRows = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => {
      const first = (r.firstname || "").toLowerCase();
      const last = (r.lastname || "").toLowerCase();
      const full = `${first} ${last}`.trim();
      const rev = `${last}, ${first}`.trim();
      return full.includes(q) || rev.includes(q) || last.includes(q) || first.includes(q);
    });
  }, [rows, query]);

  const money = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }),
    []
  );

  return (
    <div className="card">
      <div className="listHeader">
        <h2>Money List {selectedYear === "all" ? "Overall" : selectedYear}</h2>
        <div className="controls">
          <select
            className="yearSelect"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="all">Overall</option>
            {Array.from({ length: 6 }).map((_, i) => {
              const y = currentYear - i;
              return (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              );
            })}
          </select>
          <input
          ref={searchRef}
          className="search"
          placeholder="Search players…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        </div>
      </div>
      {loading ? <div>Loading…</div> : null}
      {error ? <div style={{ color: "#a00" }}>{error}</div> : null}
      <div className="list">
        <div className="row header">
          <div className="rank">#</div>
          <div className="name">Player</div>
          <div className="amount">Winnings</div>
        </div>
        {filteredRows.map((row, index) => (
          <div key={row.member_id} className="row listRow">
            <div className="rank">{index + 1}</div>
            <div className="name">
              {(row.lastname || "").trim()}, {(row.firstname || "").trim()}
            </div>
            <div className="amount">{money.format(row.total_amount ?? 0)}</div>
          </div>
        ))}
      </div>
      <style>{`
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        h2 { margin: 0; font-size: 15px; font-weight: 700; }
        .listHeader { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
        .controls { display: flex; align-items: center; gap: 8px; }
        .yearSelect {
          padding: 4px 8px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          font-size: 12px;
          background: #fff;
        }
        .search {
          padding: 4px 8px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          font-size: 12px;
          min-width: 220px;
          background: #fff;
        }
        .list { display: grid; gap: 6px; }
        .row { display: grid; grid-template-columns: 0.4fr 1.6fr 0.8fr; gap: 8px; align-items: center; }
        .row.header {
          font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
          color: #9ca3af; font-weight: 600;
        }
        .listRow {
          border-radius: 10px;
          background: #f9fafb;
          padding: 6px 8px;
          color: #374151;
          font-size: 12px;
        }
        .listRow:nth-child(even) { background: #f0f7ff; }
        .rank { font-weight: 700; color: #0f172a; }
        .name { font-weight: 500; color: #111827; }
        .amount { font-weight: 600; text-align: right; }
      `}</style>
    </div>
  );
}
