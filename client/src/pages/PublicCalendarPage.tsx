import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { publicFetch } from "../api/public";
import type { CalendarEvent } from "../types/event";
import "../components/Calendar/calendar.css";

type DayCell = {
  date: Date;
  inMonth: boolean;
  key: string;
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

function toLocalDateNoTZ(value: string | null | undefined): Date {
  if (!value) return new Date(NaN);
  const datePart = value.slice(0, 10);
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

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

function bucketEventsByDay(events: CalendarEvent[], rangeStart: Date, rangeEnd: Date) {
  const buckets = new Map<string, CalendarEvent[]>();

  for (const ev of events) {
    const s = toLocalDateNoTZ(ev.start_dt);
    const e = toLocalDateNoTZ(ev.end_dt);
    const clampStart = s < rangeStart ? rangeStart : s;
    const clampEnd = e > rangeEnd ? rangeEnd : e;

    for (const day of eachDayInclusive(clampStart, clampEnd)) {
      const key = ymd(day);
      const arr = buckets.get(key) ?? [];
      arr.push(ev);
      buckets.set(key, arr);
    }
  }

  for (const [k, arr] of buckets.entries()) {
    arr.sort((a, b) => {
      const da = toLocalDateNoTZ(a.start_dt).getTime();
      const db = toLocalDateNoTZ(b.start_dt).getTime();
      return da - db || a.id - b.id;
    });
    buckets.set(k, arr);
  }

  return buckets;
}

export default function PublicCalendarPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthStart = useMemo(() => startOfMonth(cursor), [cursor]);
  const monthEnd = useMemo(() => endOfMonth(cursor), [cursor]);
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
  const todayKey = ymd(new Date());

  useEffect(() => {
    if (!courseId) return;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await publicFetch<CalendarEvent[]>(
          `/public/${courseId}/events?start=${gridStart.toISOString()}&end=${gridEnd.toISOString()}`
        );
        setEvents(data);
      } catch (e: any) {
        setError(e.message ?? "Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [courseId, gridStart, gridEnd]);

  const title = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
    return fmt.format(cursor);
  }, [cursor]);

  const colorIndexByName = useMemo(() => {
    const map = new Map<string, number>();
    let i = 0;
    for (const ev of events) {
      const key = (ev.eventname ?? "").trim().toLowerCase() || `event-${ev.id}`;
      if (!map.has(key)) {
        map.set(key, i);
        i += 1;
      }
    }
    return map;
  }, [events]);

  return (
    <div style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
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
              <div className={`day ${cell.inMonth ? "in-month" : "out-month"} ${cell.key === todayKey ? "today" : ""}`} key={cell.key}>
                <div className="day-top">
                  <span className={cell.inMonth ? "" : "day-muted"}>{dayNum}</span>
                </div>

                {dayEvents.map((ev) => {
                  const isStart = ymd(toLocalDateNoTZ(ev.start_dt)) === cell.key;
                  const isEnd = ymd(toLocalDateNoTZ(ev.end_dt)) === cell.key;
                  const colorKey = (ev.eventname ?? "").trim().toLowerCase() || `event-${ev.id}`;
                  const colorIdx = colorIndexByName.get(colorKey) ?? 0;

                  return (
                    <div
                      className={`event ${isStart ? "event-start" : "event-cont"} ${isEnd ? "event-end" : ""} event-color-${colorIdx % 8}`}
                      key={`${cell.key}-${ev.id}`}
                      onClick={() => navigate(`/public/${courseId}/events/${ev.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(`/public/${courseId}/events/${ev.id}`);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      {ev.eventname}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
