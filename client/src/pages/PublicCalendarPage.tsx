import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { publicFetch } from "../api/public";
import type { CalendarEvent } from "../types/event";
import "../components/Calendar/calendar.css";

export default function PublicCalendarPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "refreshing" | "waking">("idle");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const monthStart = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor]);
  const monthEnd = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), [cursor]);
  const gridStart = useMemo(() => {
    const d = new Date(monthStart);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }, [monthStart]);
  const gridEnd = useMemo(() => {
    const d = new Date(monthEnd);
    d.setDate(d.getDate() + (6 - d.getDay()));
    d.setHours(23, 59, 59, 999);
    return d;
  }, [monthEnd]);

  const cells = useMemo(() => {
    const out: Array<{ date: Date; inMonth: boolean; key: string }> = [];
    const cur = new Date(gridStart);
    cur.setHours(0, 0, 0, 0);
    while (cur <= gridEnd) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const day = String(cur.getDate()).padStart(2, "0");
      out.push({ date: new Date(cur), inMonth: cur.getMonth() === cursor.getMonth(), key: `${y}-${m}-${day}` });
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [gridStart, gridEnd, cursor]);

  useEffect(() => {
    if (!courseId) return;
    const cacheKey = `public_calendar_${courseId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed?.events)) {
          setEvents(parsed.events);
          setLastUpdated(parsed?.updatedAt ?? null);
          setStatus("refreshing");
        }
      } catch {
        // ignore cache parse errors
      }
    }

    let retryTimer: number | null = null;
    const run = async () => {
      setLoading(true);
      setError(null);
      setStatus(cached ? "refreshing" : "waking");
      try {
        const data = await publicFetch<CalendarEvent[]>(
          `/public/${courseId}/events?start=${gridStart.toISOString()}&end=${gridEnd.toISOString()}`
        );
        setEvents(data);
        const updatedAt = new Date().toISOString();
        setLastUpdated(updatedAt);
        localStorage.setItem(cacheKey, JSON.stringify({ updatedAt, events: data }));
        setStatus("idle");
      } catch (e: any) {
        setError(e.message ?? "Failed to load events");
        setStatus("waking");
        if (!retryTimer) {
          retryTimer = window.setTimeout(run, 8000);
        }
      } finally {
        setLoading(false);
      }
    };
    run();

    return () => {
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [courseId, gridStart, gridEnd]);

  const title = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
    return fmt.format(cursor);
  }, [cursor]);

  return (
    <div className="calendar">
      <div className="cal-header">
        <button className="cal-btn" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
          ← Prev
        </button>
        <h2>{title}</h2>
        <button className="cal-btn" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
          Next →
        </button>
      </div>
      {status === "refreshing" && (
        <div className="loading">Refreshing from server…</div>
      )}
      {status === "waking" && (
        <div className="loading">Waking server… showing cached data.</div>
      )}
      {loading && status === "idle" && <div className="loading">Loading…</div>}
      {error && <div className="loading" style={{ color: "#a00" }}>{error}</div>}
      {lastUpdated ? (
        <div className="loading">Last updated: {new Date(lastUpdated).toLocaleString()}</div>
      ) : null}

      <div className="cal-grid" role="grid" aria-label="Month calendar">
        {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((d) => (
          <div className="cal-dow" key={d}>{d}</div>
        ))}
        {cells.map((cell) => (
          <div className="day" key={cell.key}>
            <div className="day-top">
              <span className={cell.inMonth ? "" : "day-muted"}>{cell.date.getDate()}</span>
            </div>
            {events.filter((e) => {
              const sd = new Date(e.start_dt);
              const ed = new Date(e.end_dt);
              const key = cell.key;
              const y = sd.getFullYear();
              const m = String(sd.getMonth() + 1).padStart(2, "0");
              const d = String(sd.getDate()).padStart(2, "0");
              const ys = ed.getFullYear();
              const ms = String(ed.getMonth() + 1).padStart(2, "0");
              const ds = String(ed.getDate()).padStart(2, "0");
              const sk = `${y}-${m}-${d}`;
              const ek = `${ys}-${ms}-${ds}`;
              return key >= sk && key <= ek;
            }).map((ev, idx) => (
              <div
                key={`${cell.key}-${ev.id}-${idx}`}
                className={`event event-color-${idx % 4}`}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/public/${courseId}/events/${ev.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/public/${courseId}/events/${ev.id}`);
                  }
                }}
              >
                {ev.eventname}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
