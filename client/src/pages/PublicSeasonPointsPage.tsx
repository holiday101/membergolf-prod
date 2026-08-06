import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { publicFetch } from "../api/public";

type PointsRow = {
  member_id: number;
  firstname: string | null;
  lastname: string | null;
  entries: number;
  participation_points: number;
  money_points: number;
  total_points: number;
};

export default function PublicSeasonPointsPage() {
  const { courseId, rosterId } = useParams();
  const [rows, setRows] = useState<PointsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [query, setQuery] = useState("");
  const [rosterName, setRosterName] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!courseId || !rosterId) {
      setRosterName(null);
      return;
    }
    (async () => {
      try {
        const rosters = await publicFetch<Array<{ roster_id: number; rostername: string }>>(
          `/public/${courseId}/rosters`
        );
        const match = rosters.find((r) => String(r.roster_id) === rosterId);
        setRosterName(match?.rostername ?? null);
      } catch {
        setRosterName(null);
      }
    })();
  }, [courseId, rosterId]);

  useEffect(() => {
    const loadYears = async () => {
      if (!courseId) return;
      try {
        const rosterParam = rosterId ? `?roster_id=${rosterId}` : "";
        const years = await publicFetch<number[]>(
          `/public/${courseId}/seasonpoints/years${rosterParam}`
        );
        setAvailableYears(years);
        if (years.length > 0 && !years.includes(currentYear)) {
          setSelectedYear(String(years[0]));
        }
      } catch {
        setAvailableYears([]);
      }
    };
    loadYears();
  }, [courseId, rosterId, currentYear]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (selectedYear !== "all") params.set("year", selectedYear);
        if (rosterId) params.set("roster_id", rosterId);
        const qs = params.toString();
        const data = await publicFetch<PointsRow[]>(
          `/public/${courseId}/seasonpoints${qs ? `?${qs}` : ""}`
        );
        setRows(data);
      } catch (e: any) {
        setError(e.message ?? "Failed to load season points list");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [courseId, rosterId, selectedYear]);

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
      {rosterId ? <h2>{rosterName ? `${rosterName} Season Points List` : "Season Points List"}</h2> : null}
      <div className="listHeader">
        <div className="controls">
          <input
            ref={searchRef}
            className="search"
            placeholder="Search players…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <select
            className="yearSelect"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="all">Overall</option>
            {availableYears.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
      {loading ? <div>Loading…</div> : null}
      {error ? <div style={{ color: "#a00" }}>{error}</div> : null}
      <div className="list">
        <div className="row header">
          <div className="rank">#</div>
          <div className="name">Player</div>
          <div className="entries">Entries</div>
          <div className="participation">Participation</div>
          <div className="moneyPts">Money</div>
          <div className="total">Total</div>
        </div>
        {filteredRows.map((row, index) => (
          <Link
            key={row.member_id}
            className="row listRow linkRow"
            to={`/public/${courseId}/members/${row.member_id}`}
          >
            <div className="rank">{index + 1}</div>
            <div className="name">
              {(row.lastname || "").trim()}, {(row.firstname || "").trim()}
            </div>
            <div className="entries">{row.entries}</div>
            <div className="participation">{row.participation_points}</div>
            <div className="moneyPts" title={money.format(row.money_points)}>
              {Math.round(row.money_points)}
            </div>
            <div className="total">{Math.round(row.total_points)}</div>
          </Link>
        ))}
      </div>
      <style>{`
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        h2 { margin: 0; font-size: 15px; font-weight: 700; }
        .listHeader { display: flex; align-items: center; justify-content: flex-start; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
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
        .row { display: grid; grid-template-columns: 0.35fr 1.4fr 0.6fr 0.75fr 0.6fr 0.65fr; gap: 8px; align-items: center; }
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
        .linkRow { text-decoration: none; cursor: pointer; }
        .linkRow:hover { background: #e0f2fe; }
        .rank { font-weight: 700; color: #0f172a; }
        .name { font-weight: 500; color: #111827; }
        .entries, .participation, .moneyPts, .total { font-weight: 600; text-align: right; }
        .entries { color: #6b7280; }
        .total { color: #0f172a; font-weight: 800; }

        @media (max-width: 560px) {
          .controls { flex-direction: column; align-items: stretch; }
          .yearSelect { width: 100%; }
          .search { width: 100%; }
          .row {
            grid-template-columns: auto 1fr 1fr 1fr auto;
            grid-template-areas:
              "rank name    name          name  total"
              "rank entries participation money total";
          }
          .row.header { display: none; }
          .listRow { padding: 8px 10px; }
          .rank { grid-area: rank; font-size: 11px; color: #6b7280; align-self: start; }
          .name { grid-area: name; font-size: 13px; font-weight: 600; }
          .total { grid-area: total; font-size: 14px; align-self: end; }
          .entries, .participation, .moneyPts {
            display: inline-flex;
            justify-content: flex-start;
            font-size: 11px;
            color: #6b7280;
            font-weight: 500;
          }
          .entries { grid-area: entries; }
          .participation { grid-area: participation; }
          .moneyPts { grid-area: money; }
          .entries::after { content: " ent"; }
          .participation::before { content: "· "; }
          .moneyPts::before { content: "· $"; }
        }
      `}</style>
    </div>
  );
}
