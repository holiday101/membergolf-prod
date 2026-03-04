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
  const [decimalHandicapEnabled, setDecimalHandicapEnabled] = useState(false);

  useEffect(() => {
    const loadCourseSettings = async () => {
      try {
        const res = await apiFetch("/course");
        if (!res.ok) return;
        const data = await res.json();
        setDecimalHandicapEnabled(data?.decimalhandicap_yn === 1);
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

  const handlePrint = () => {
    const esc = (v: string) =>
      v
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

    const tableRows = rows
      .map((r) => {
        const member = `${(r.lastname || "").trim()}, ${(r.firstname || "").trim()}`;
        const h9 = formatHandicap(r.rhandicap, decimalHandicapEnabled);
        const h18 = formatHandicap(r.rhandicap18, decimalHandicapEnabled);
        return `<tr><td>${esc(member)}</td><td>${esc(String(h9 ?? ""))}</td><td>${esc(String(h18 ?? ""))}</td></tr>`;
      })
      .join("");

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Handicaps</title>
    <style>
      @page { margin: 0.2in; }
      body { font-family: Arial, sans-serif; margin: 0; color: #111827; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th, td { border-top: 1px solid #d1d5db; padding: 2px 4px; font-size: 9px; line-height: 1.0; text-align: left; }
      thead th { border-top: none; font-size: 9px; font-weight: 700; color: #374151; }
      th:nth-child(1), td:nth-child(1) { width: 64%; }
      th:nth-child(2), td:nth-child(2) { width: 18%; }
      th:nth-child(3), td:nth-child(3) { width: 18%; }
      tr { page-break-inside: avoid; }
    </style>
  </head>
  <body>
    <table>
      <thead>
        <tr>
          <th>Member</th>
          <th>Handicap (9)</th>
          <th>Handicap (18)</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </body>
</html>`;

    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);

    const doc = frame.contentWindow?.document;
    if (!doc || !frame.contentWindow) {
      document.body.removeChild(frame);
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const printAndCleanup = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => {
        if (frame.parentNode) frame.parentNode.removeChild(frame);
      }, 1000);
    };

    if (doc.readyState === "complete") {
      printAndCleanup();
    } else {
      frame.onload = printAndCleanup;
    }
  };

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
            <button className="btn" onClick={handlePrint}>
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
          <div className="table printArea">
            <div className="tableHead">
              <span>Member</span>
              <span>Handicap (9)</span>
              <span>Handicap (18)</span>
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
          body * { display: none !important; }
          .printArea, .printArea * { display: revert !important; }
          .printArea {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            gap: 2px;
            font-size: 10px;
            line-height: 1.1;
          }
          .printArea .tableHead { font-size: 10px; }
          .printArea .tableRow { font-size: 10px; padding: 2px 0; border-top: 1px solid #e5e7eb; }
          .tableRow, .tableHead { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
