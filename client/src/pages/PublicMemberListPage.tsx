import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { publicFetch } from "../api/public";

type Member = {
  member_id: number;
  firstname: string | null;
  lastname: string | null;
  handicap: number | null;
};

function formatHandicap(value: number | null) {
  if (value === null || value === undefined) return "—";
  if (Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(2);
}

export default function PublicMemberListPage() {
  const { courseId } = useParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await publicFetch<Member[]>(`/public/${courseId}/members`);
        setMembers(data);
      } catch (e: any) {
        setError(e.message ?? "Failed to load members");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [courseId]);

  const filteredMembers = members.filter((m) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const first = (m.firstname || "").toLowerCase();
    const last = (m.lastname || "").toLowerCase();
    const full = `${first} ${last}`.trim();
    const rev = `${last}, ${first}`.trim();
    return full.includes(q) || rev.includes(q) || last.includes(q) || first.includes(q);
  });

  return (
    <div className="card">
      <div className="listHeader">
        <h2>Members</h2>
        <input
          className="search"
          placeholder="Search members…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      {loading ? <div>Loading…</div> : null}
      {error ? <div style={{ color: "#a00" }}>{error}</div> : null}
      <div className="list">
        <div className="row header">
          <div className="name">Member</div>
          <div className="handicap">Handicap</div>
        </div>
        {filteredMembers.map((m) => (
          <Link
            key={m.member_id}
            className="row linkRow"
            to={`/public/${courseId}/members/${m.member_id}`}
          >
            <div className="name">
              {(m.lastname || "").trim()}, {(m.firstname || "").trim()}
            </div>
            <div className="handicap">{formatHandicap(m.handicap)}</div>
          </Link>
        ))}
      </div>
      <style>{`
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        h2 { margin: 0; font-size: 16px; }
        .listHeader { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
        .search {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          font-size: 12px;
          min-width: 220px;
        }
        .list { display: grid; gap: 2px; }
        .row { display: flex; justify-content: space-between; padding: 2px 6px; line-height: 1.2; color: #6b7280; }
        .row:nth-child(even) { background: #f0f7ff; }
        .row.header { font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
        .linkRow { text-decoration: none; border-radius: 6px; cursor: pointer; }
        .linkRow:hover { background: #e0f2fe; }
        .name { font-weight: 600; font-size: 12px; }
        .handicap { font-size: 11px; }
      `}</style>
    </div>
  );
}
