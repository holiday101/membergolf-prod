import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchEvents } from "../../api/events";
import type { CalendarEvent } from "../../types/event";
import "./calendar.css";



type DayCell = {
  date: Date;
  inMonth: boolean;
  key: string; // YYYY-MM-DD
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function startOfWeekSunday(d: Date) {
  const out = new Date(d);
  out.setDate(d.getDate() - d.getDay());
  out.setHours(0, 0, 0, 0);
  return out;
}
function endOfWeekSaturday(d: Date) {
  const out = new Date(d);
  out.setDate(d.getDate() + (6 - d.getDay()));
  out.setHours(23, 59, 59, 999);
  return out;
}
function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Inclusive day iteration
function eachDayInclusive(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);

  while (cur <= last) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// Map DB events -> day buckets (events appear on every spanned day)
function bucketEventsByDay(events: CalendarEvent[], rangeStart: Date, rangeEnd: Date) {
  const buckets = new Map<string, CalendarEvent[]>();

  for (const ev of events) {
    const s = new Date(ev.start_dt);
    const e = new Date(ev.end_dt);

    // clamp to visible range so we don't iterate extra days
    const clampStart = s < rangeStart ? rangeStart : s;
    const clampEnd = e > rangeEnd ? rangeEnd : e;

    for (const day of eachDayInclusive(clampStart, clampEnd)) {
      const key = ymd(day);
      const arr = buckets.get(key) ?? [];
      arr.push(ev);
      buckets.set(key, arr);
    }
  }

  // optional: sort inside each day by start time then id
  for (const [k, arr] of buckets.entries()) {
    arr.sort((a, b) => {
      const da = new Date(a.start_dt).getTime();
      const db = new Date(b.start_dt).getTime();
      return da - db || a.id - b.id;
    });
    buckets.set(k, arr);
  }

  return buckets;
}

export default function CalendarMonth() {
  const [cursor, setCursor] = useState(() => new Date()); // month being viewed
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const monthStart = useMemo(() => startOfMonth(cursor), [cursor]);
  const monthEnd = useMemo(() => endOfMonth(cursor), [cursor]);

  // Full grid range: start Sunday before monthStart through Saturday after monthEnd
  const gridStart = useMemo(() => startOfWeekSunday(monthStart), [monthStart]);
  const gridEnd = useMemo(() => endOfWeekSaturday(monthEnd), [monthEnd]);

  const cells: DayCell[] = useMemo(() => {
    const out: DayCell[] = [];
    const cur = new Date(gridStart);
    cur.setHours(0, 0, 0, 0);

    while (cur <= gridEnd) {
      out.push({
        date: new Date(cur),
        inMonth: cur.getMonth() === cursor.getMonth(),
        key: ymd(cur),
      });
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [gridStart, gridEnd, cursor]);

  const buckets = useMemo(() => bucketEventsByDay(events, gridStart, gridEnd), [events, gridStart, gridEnd]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use ISO strings for API
        const startISO = gridStart.toISOString();
        const endISO = gridEnd.toISOString();
        const data = await fetchEvents(startISO, endISO);
        setEvents(data);
      } catch (e: any) {
        setError(e.message ?? "Failed to load events");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [gridStart, gridEnd]);

  const title = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
    return fmt.format(cursor);
  }, [cursor]);

  const colorIndexById = useMemo(() => {
    const map = new Map<number, number>();
    let i = 0;
    for (const ev of events) {
      if (!map.has(ev.id)) {
        map.set(ev.id, i);
        i += 1;
      }
    }
    return map;
  }, [events]);

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

      {loading && <div className="loading">Loading…</div>}
      {error && <div className="loading" style={{ color: "#a00" }}>{error}</div>}

      <div className="cal-grid" role="grid" aria-label="Month calendar">
        {DOW.map((d) => (
          <div className="cal-dow" key={d}>{d}</div>
        ))}

        {cells.map((cell) => {
          const dayEvents = buckets.get(cell.key) ?? [];
          const dayNum = cell.date.getDate();

          return (
            <div className={`day ${cell.inMonth ? "in-month" : "out-month"}`} key={cell.key}>
              <div className="day-top">
                <span className={cell.inMonth ? "" : "day-muted"}>{dayNum}</span>
              </div>

              {dayEvents.map((ev) => (
                (() => {
                  const isStart = ymd(new Date(ev.start_dt)) === cell.key;
                  const isEnd = ymd(new Date(ev.end_dt)) === cell.key;
                  const colorIdx = colorIndexById.get(ev.id) ?? 0;
                  return (
                <div
                  className={`event ${isStart ? "event-start" : "event-cont"} ${isEnd ? "event-end" : ""} event-color-${colorIdx % 8}`}
                  key={`${cell.key}-${ev.id}`}
                  onClick={() => navigate(`/events/${ev.id}`, { state: { fromCalendar: true } })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/events/${ev.id}`, { state: { fromCalendar: true } });
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {ev.eventname}
                </div>
                  );
                })()
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
