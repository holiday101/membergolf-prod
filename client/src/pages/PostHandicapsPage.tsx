import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../auth";
import { formatHandicap } from "../utils/formatHandicap";

type HandicapRow = {
  member_id: number;
  firstname: string | null;
  lastname: string | null;
  rhandicap: number | null;
  rhandicap18: number | null;
};

export default function PostHandicapsPage() {
  const { id } = useParams();
  const [eventName, setEventName] = useState<string | null>(null);
  const [rows, setRows] = useState<HandicapRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ran, setRan] = useState(false);
  const [lastPosted, setLastPosted] = useState<string | null>(null);
  const [decimalHandicapEnabled, setDecimalHandicapEnabled] = useState(true);

  useEffect(() => {
    const loadCourseSettings = async () => {
      try {
        const res = await apiFetch("/course");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.decimalhandicap_yn === 0 || data?.decimalhandicap_yn === 1) {
          setDecimalHandicapEnabled(data.decimalhandicap_yn === 1);
        }
      } catch {
        // ignore
      }
    };
    loadCourseSettings();
  }, []);

  const loadEvent = async () => {
    if (!id) return;
    try {
      const res = await apiFetch(`/api/events/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setEventName(data?.eventname ?? null);
    } catch {
      setEventName(null);
    }
  };

  const loadExisting = async () => {
    if (!id) return;
    try {
      const res = await apiFetch(`/api/events/${id}/handicaps`);
      if (!res.ok) return;
      const data = await res.json();
      setRows(data?.rows ?? []);
      setLastPosted(data?.last_posted ?? null);
      setRan(Boolean((data?.rows ?? []).length));
    } catch {
      setRows([]);
      setLastPosted(null);
      setRan(false);
    }
  };

  const run = async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/events/${id}/handicaps`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRows(data?.rows ?? []);
      setLastPosted(data?.last_posted ?? null);
      setRan(true);
    } catch (e: any) {
      setError(e.message ?? "Failed to post handicaps");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRows([]);
    setRan(false);
    loadEvent();
    loadExisting();
  }, [id]);

  return (
    <div className="page">
      <div className="eventHeader">
        <Link className="backLink" to={id ? `/events/${id}` : "/events"}>
          ← Back to Event
        </Link>
        <div>
          <div className="eventTitle">{eventName ?? "Post Handicaps"}</div>
          {lastPosted ? (
            <div className="subtle">Last posted: {new Date(lastPosted).toLocaleString()}</div>
          ) : null}
        </div>
      </div>
      {error ? <div className="alert">{error}</div> : null}

      <div className="card">
        <div className="headerRow">
          <div className="headerActions">
            <button className="btn" onClick={() => window.print()}>
              Print
            </button>
            <button className="btn primary" onClick={run} disabled={loading}>
              {loading ? "Running…" : "Post Handicaps"}
            </button>
          </div>
        </div>

        {!ran ? (
          <div className="muted">Run the procedure to generate handicaps for this event.</div>
        ) : (
          <div className="table">
            <div className="tableHead">
              <span>Member</span>
              <span>RHandicap</span>
              <span>RHandicap18</span>
            </div>
            {rows.map((r) => (
              <div key={r.member_id} className="tableRow">
                <span>
                  {(r.lastname || "").trim()}, {(r.firstname || "").trim()}
                </span>
                <span>{formatHandicap(r.rhandicap, decimalHandicapEnabled)}</span>
                <span>{formatHandicap(r.rhandicap18, decimalHandicapEnabled)}</span>
              </div>
            ))}
            {!rows.length ? <div className="muted">No rows returned.</div> : null}
          </div>
        )}
      </div>

      <style>{`
        .page { display: grid; gap: 14px; }
        .eventHeader { display: flex; align-items: center; gap: 10px; }
        .eventTitle { font-size: 16px; font-weight: 700; color: #111827; }
        .backLink {
          color: #111827;
          text-decoration: none;
          font-weight: 600;
          font-size: 12px;
          background: #fff;
          border: 1px solid #d1d5db;
          padding: 6px 10px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          width: fit-content;
        }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        .headerRow { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-bottom: 10px; }
        .headerActions { display: flex; gap: 8px; }
        .title { font-size: 16px; font-weight: 700; color: #111827; }
        .subtle { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .btn { border: 1px solid #d1d5db; background: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; }
        .btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .alert { padding: 10px 12px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; color: #991b1b; }
        .muted { color: #6b7280; font-size: 12px; }
        .table { display: grid; gap: 8px; }
        .tableHead, .tableRow { display: grid; gap: 8px; grid-template-columns: 2fr 1fr 1fr; align-items: center; }
        .tableHead { font-weight: 600; font-size: 12px; color: #6b7280; }
        .tableRow { padding: 6px 0; border-top: 1px solid #f3f4f6; font-size: 12px; color: #374151; }
        @media print {
          @page { margin: 0.5in; }
          .page > * { display: none !important; }
          .page .eventHeader { display: flex !important; gap: 10px; align-items: center; }
          .page .card { display: block !important; border: none; padding: 0; }
          .page .headerRow { display: none !important; }
          .page .headerActions, .backLink, .alert, .muted { display: none !important; }
          .page .eventTitle { font-size: 18px; color: #111827; }
          .table { margin: 0; }
          .tableRow, .tableHead { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
