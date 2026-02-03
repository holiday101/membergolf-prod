import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { publicFetch } from "../api/public";
import type { CalendarEvent } from "../types/event";

function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

export default function PublicEventListPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [rangeFilter, setRangeFilter] = useState<string>("near");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const now = new Date();
        let start = startOfYear(now);
        let end = new Date(now);
        end.setFullYear(end.getFullYear() + 2);

        if (rangeFilter === "near") {
          start = new Date(now);
          start.setDate(start.getDate() - 120);
          end = new Date(now);
          end.setDate(end.getDate() + 120);
        } else if (rangeFilter === "year") {
          start = startOfYear(now);
          end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        } else if (rangeFilter === "all") {
          start = new Date("2000-01-01T00:00:00Z");
          end = new Date("2100-12-31T23:59:59Z");
        }

        const data = await publicFetch<CalendarEvent[]>(
          `/public/${courseId}/events?start=${start.toISOString()}&end=${end.toISOString()}`
        );
        setEvents(data);
      } catch (e: any) {
        setError(e.message ?? "Failed to load events");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [courseId, rangeFilter]);

  const displayEvents = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) => new Date(a.start_dt).getTime() - new Date(b.start_dt).getTime()
    );
    if (rangeFilter === "near") {
      const now = Date.now();
      const past = sorted.filter((e) => new Date(e.start_dt).getTime() <= now).slice(-5);
      const future = sorted.filter((e) => new Date(e.start_dt).getTime() > now).slice(0, 5);
      return [...past, ...future];
    }
    return sorted;
  }, [events, rangeFilter]);

  return (
    <div className="card">
      <div className="filterRow">
        <div className="filterTitle">Event List</div>
        <select
          className="filterSelect"
          value={rangeFilter}
          onChange={(e) => setRangeFilter(e.target.value)}
        >
          <option value="near">Last 5 / Next 5</option>
          <option value="year">All Events This Year</option>
          <option value="all">All Events</option>
        </select>
      </div>
      {loading ? <div>Loading…</div> : null}
      {error ? <div style={{ color: "#a00" }}>{error}</div> : null}
      <div className="table">
        <div className="tableHead">
          <span>Event</span>
          <span>Start</span>
          <span>End</span>
          <span>Nine</span>
        </div>
        {displayEvents.map((e) => (
          <div
            key={e.id}
            className="tableRow"
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/public/${courseId}/events/${e.id}`)}
            onKeyDown={(evt) => {
              if (evt.key === "Enter") navigate(`/public/${courseId}/events/${e.id}`);
            }}
          >
            <span>{e.eventname}</span>
            <span>{new Date(e.start_dt).toLocaleDateString()}</span>
            <span>{new Date(e.end_dt).toLocaleDateString()}</span>
            <span>{(e as any).ninename ?? e.nine_id ?? "—"}</span>
          </div>
        ))}
      </div>
      <style>{`
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        .filterRow { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .filterTitle { font-size: 15px; font-weight: 700; text-align: center; flex: 1; }
        .filterSelect {
          border: 1px solid #e5e7eb; border-radius: 8px; padding: 4px 8px; font-size: 12px;
          margin-left: auto; background: #fff;
        }
        .table { display: grid; gap: 6px; }
        .tableHead, .tableRow {
          display: grid; grid-template-columns: 1.6fr 0.8fr 0.8fr 0.6fr;
          gap: 8px; align-items: center;
        }
        .tableHead {
          font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
          color: #9ca3af; font-weight: 600;
        }
        .tableRow {
          background: #f9fafb; border-radius: 10px; padding: 6px 8px; color: #374151;
          font-size: 12px;
          cursor: pointer;
        }
        .tableRow:nth-child(even) { background: #f0f7ff; }
        .tableRow span:first-child { font-weight: 500; color: #111827; }
      `}</style>
    </div>
  );
}
