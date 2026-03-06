import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../auth";

type SubEventRow = {
  subevent_id: number;
  event_id: number | null;
  eventname: string | null;
  eventtype_id: number | null;
  eventtypename: string | null;
  roster_id: number | null;
  rostername: string | null;
  amount: number | null;
  addedmoney: number | null;
};

function subEventRoute(
  subeventId: number,
  eventTypeId: number | null | undefined,
  eventTypeName: string | null | undefined
) {
  if (eventTypeId === 5) return `/subevents/${subeventId}/stroke-net`;
  if (eventTypeId === 1 || eventTypeId === 6) return `/subevents/${subeventId}/stroke`;
  if (eventTypeId === 2 || eventTypeId === 10) return `/subevents/${subeventId}/bestball`;
  if (eventTypeId === 4 || eventTypeId === 9) return `/subevents/${subeventId}/chicago`;

  const normalized = (eventTypeName ?? "").toLowerCase();
  if (normalized.includes("stroke") && normalized.includes("net")) return `/subevents/${subeventId}/stroke-net`;
  if (normalized.includes("stroke")) return `/subevents/${subeventId}/stroke`;
  if (normalized.includes("best ball") || normalized.includes("bestball")) return `/subevents/${subeventId}/bestball`;
  if (normalized.includes("chicago")) return `/subevents/${subeventId}/chicago`;
  return `/subevents/${subeventId}`;
}

export default function SubEventListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventParam = searchParams.get("event");
  const [rows, setRows] = useState<SubEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const url = eventParam ? `/subevents?event=${eventParam}` : "/subevents";
        const res = await apiFetch(url);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setRows(data);
      } catch (e: any) {
        setError(e.message ?? "Failed to load subevents");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [eventParam]);

  const display = useMemo(() => rows, [rows]);

  return (
    <div className="card">
      <div className="headerRow">
        <div className="title">Sub Events</div>
      </div>
      {loading ? <div className="muted">Loading…</div> : null}
      {error ? <div className="error">{error}</div> : null}
      <div className="table">
        <div className="tableHead">
          <span>Sub Event</span>
          <span>Event</span>
          <span>Type</span>
          <span>Roster</span>
          <span>Amount / Player</span>
          <span>Added Money</span>
        </div>
        {display.map((row) => (
          <div
            key={row.subevent_id}
            className="tableRow"
            role="button"
            tabIndex={0}
            onClick={() => navigate(subEventRoute(row.subevent_id, row.eventtype_id, row.eventtypename))}
            onKeyDown={(evt) => {
              if (evt.key === "Enter") navigate(subEventRoute(row.subevent_id, row.eventtype_id, row.eventtypename));
            }}
          >
            <span>#{row.subevent_id}</span>
            <span>{row.eventname ?? row.event_id ?? "—"}</span>
            <span>{row.eventtypename ?? row.eventtype_id ?? "—"}</span>
            <span>{row.rostername ?? row.roster_id ?? "—"}</span>
            <span>{row.amount != null ? row.amount.toFixed(2) : "—"}</span>
            <span>{row.addedmoney != null ? row.addedmoney.toFixed(2) : "—"}</span>
          </div>
        ))}
        {display.length === 0 && !loading ? <div className="empty">No subevents found</div> : null}
      </div>
      <style>{`
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        .headerRow { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .title { font-size: 16px; font-weight: 700; color: #111827; }
        .table { display: grid; gap: 6px; margin-top: 12px; }
        .tableHead, .tableRow {
          display: grid; grid-template-columns: 90px 1.2fr 0.8fr 1fr 0.8fr 0.8fr; gap: 8px; align-items: center;
        }
        .tableHead { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; }
        .tableRow {
          background: #f9fafb; border-radius: 10px; padding: 6px 8px; color: #374151;
          font-size: 12px; cursor: pointer;
        }
        .tableRow:hover { background: #eef2ff; }
        .empty { color: #9ca3af; font-size: 12px; padding: 6px 0; }
        .muted { color: #6b7280; font-size: 12px; }
        .error { color: #a00; font-size: 12px; }
      `}</style>
    </div>
  );
}
