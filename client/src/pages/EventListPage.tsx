import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../auth";
import { fetchEvents } from "../api/events";

type EventRow = {
  id: number;
  eventname: string;
  start_dt: string;
  end_dt: string;
  nine_id: number | null;
  ninename?: string | null;
};

type Nine = {
  nine_id: number;
  ninename: string;
};

type FormState = {
  eventname: string;
  start_dt: string;
  end_dt: string;
  nine_id: string;
  handicap_yn: boolean;
};

function toDateInput(value: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

const emptyForm: FormState = {
  eventname: "",
  start_dt: toDateInput(new Date()),
  end_dt: toDateInput(new Date()),
  nine_id: "",
  handicap_yn: false,
};

function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

export default function EventListPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [nines, setNines] = useState<Nine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [rangeFilter, setRangeFilter] = useState<string>("near");

  const nineOptions = useMemo(() => {
    return nines.map((n) => ({ value: String(n.nine_id), label: n.ninename }));
  }, [nines]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const meRes = await apiFetch("/me");
      if (!meRes.ok) throw new Error(await meRes.text());
      const me = await meRes.json();
      if (!me?.user?.courseId) {
        navigate("/calendar", { replace: true });
        return;
      }

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

      const [eventsData, ninesRes] = await Promise.all([
        fetchEvents(start.toISOString(), end.toISOString()),
        apiFetch("/nines"),
      ]);

      if (!ninesRes.ok) throw new Error(await ninesRes.text());
      const ninesJson = await ninesRes.json();

      setEvents(eventsData);
      setNines(ninesJson);
    } catch (err: any) {
      setError(String(err?.message || "Failed to load events"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [rangeFilter]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

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

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const payload: any = {
        eventname: form.eventname.trim(),
        start_dt: form.start_dt ? new Date(`${form.start_dt}T00:00:00`).toISOString() : null,
        end_dt: form.end_dt ? new Date(`${form.end_dt}T00:00:00`).toISOString() : null,
        nine_id: form.nine_id ? Number(form.nine_id) : null,
        handicap_yn: form.handicap_yn ? 1 : 0,
      };

      const res = await apiFetch("/api/events", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
      }

      await loadData();
      setForm(emptyForm);
    } catch (err: any) {
      setError(String(err?.message || "Request failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      {error && (
        <div className="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid">
        <section className="card">
          <h2 className="sectionTitle">Create Event</h2>

          <div className="form">
            <label className="formLabel">
              Event Name
              <input
                value={form.eventname}
                onChange={(e) => setField("eventname", e.target.value)}
              />
            </label>

            <div className="dateRow">
              <label className="formLabel dateLabel">
                Start Date
                <input
                  type="date"
                  value={form.start_dt}
                  onChange={(e) => setField("start_dt", e.target.value)}
                />
              </label>
              <span className="dateSep">-</span>
              <label className="formLabel dateLabel">
                End Date
                <input
                  type="date"
                  value={form.end_dt}
                  onChange={(e) => setField("end_dt", e.target.value)}
                />
              </label>
            </div>

            <label className="formLabel">
              Nine
              <select
                value={form.nine_id}
                onChange={(e) => setField("nine_id", e.target.value)}
              >
                <option value="">None</option>
                {nineOptions.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="formLabel checkbox">
              <input
                type="checkbox"
                checked={form.handicap_yn}
                onChange={(e) => setField("handicap_yn", e.target.checked)}
              />
              Handicap Y/N
            </label>

            <div className="actions">
              <button className="btn primary" onClick={submit} disabled={busy}>
                {busy ? "Saving…" : "Create event"}
              </button>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="filterRow">
            <div className="filterTitle">Events</div>
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
          {loading ? (
            <div className="muted">Loading…</div>
          ) : (
            <div className="table">
              <div className="tableHead">
                <span>Event</span>
                <span>Date</span>
                <span>Nine</span>
              </div>
              {displayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="tableRow clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/events/${ev.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/events/${ev.id}`);
                    }
                  }}
                >
                  <span className="eventName">
                    <span className="editIconBtn inline" aria-hidden="true">
                      ✎
                    </span>
                    {ev.eventname}
                  </span>
                  <span className="dateRange">
                    {new Date(ev.start_dt).toLocaleDateString(undefined, {
                      month: "numeric",
                      day: "numeric",
                    })}{" "}
                    -{" "}
                    {new Date(ev.end_dt).toLocaleDateString(undefined, {
                      month: "numeric",
                      day: "numeric",
                    })}
                  </span>
                  <span>{ev.ninename ?? ev.nine_id ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <style>{`
        .page { display: grid; gap: 14px; }
        .grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        h2 { margin: 0; font-size: 15px; text-align: center; }
        .sectionTitle { color: #6b7280; }
        .form { display: grid; gap: 10px; }
        label { display: grid; gap: 4px; font-weight: 600; font-size: 12px; }
        .formLabel { color: #6b7280; }
        input, select {
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          font-size: 13px;
          font-family: inherit;
          line-height: 1.2;
        }
        input[type="date"] {
          font-family: inherit;
          font-size: 13px;
        }
        .dateRow {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: end;
          gap: 6px;
        }
        .dateLabel { margin: 0; }
        .dateSep { font-weight: 700; color: #6b7280; padding-bottom: 6px; }
        .checkbox { display: flex; align-items: center; gap: 8px; }
        .checkbox input { width: 16px; height: 16px; padding: 0; }
        .actions { display: flex; gap: 8px; }
        .btn { border: 1px solid #d1d5db; background: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; }
        .btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .btn.small { padding: 5px 8px; font-size: 11px; }
        .alert { padding: 10px 12px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; color: #991b1b; }
        .muted { color: #6b7280; font-size: 12px; }
        .filterRow { display: grid; gap: 6px; justify-items: center; margin: 0 0 6px; }
        .filterTitle { font-size: 15px; color: #6b7280; font-weight: 600; }
        .filterSelect { padding: 6px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 12px; }
        .table { display: grid; gap: 8px; margin-top: 20px; }
        .tableHead, .tableRow { display: grid; gap: 8px; grid-template-columns: 2fr 1.2fr 1fr; align-items: center; }
        .tableHead { font-weight: 600; font-size: 12px; color: #6b7280; }
        .tableRow { padding: 6px 0; border-top: 1px solid #f3f4f6; font-size: 12px; }
        .tableRow:nth-child(even) {
          background: #f0f7ff;
          border-radius: 10px;
          padding: 6px 8px;
          margin: 0 -8px;
        }
        .tableRow.clickable { cursor: pointer; }
        .tableRow.clickable:hover { background: #e0f2fe; }
        .tableRow.clickable:focus { outline: 2px solid #93c5fd; outline-offset: 2px; }
        .eventName { display: inline-flex; align-items: center; gap: 8px; }
        .dateRange { font-weight: 600; color: #111827; }
        .editIconBtn {
          border: 1px solid #d1d5db;
          background: #fff;
          width: 26px;
          height: 26px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .editIconBtn.inline { width: 22px; height: 22px; border-radius: 6px; }
        .editIconBtn:hover { background: #f7f8fb; }
      `}</style>
    </div>
  );
}
