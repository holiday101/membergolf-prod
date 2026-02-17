import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../auth";

type EventRow = {
  id: number;
  eventname: string;
  eventdescription?: string | null;
  start_dt: string;
  end_dt: string;
  nine_id: number | null;
  handicap_yn?: number | null;
};

type Nine = {
  nine_id: number;
  ninename: string;
};

type SubEventType = { eventtype_id: number; eventtypename: string | null };
type SubEventRoster = { roster_id: number; rostername: string | null };
type SubEventRow = { subevent_id: number; eventtypename: string | null };

type FormState = {
  eventname: string;
  start_dt: string;
  end_dt: string;
  nine_id: string;
  handicap_yn: boolean;
};

const emptyForm: FormState = {
  eventname: "",
  start_dt: "",
  end_dt: "",
  nine_id: "",
  handicap_yn: false,
};

const emptySubEventForm = {
  eventtype_id: "",
  roster_id: "",
  amount: "",
  addedmoney: "",
};

function toInputDate(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function EditEventPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [nines, setNines] = useState<Nine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saveSuccess, setSaveSuccess] = useState<string>("");
  const saveSuccessTimer = useRef<number | null>(null);
  const [subEventTypes, setSubEventTypes] = useState<SubEventType[]>([]);
  const [subEventRosters, setSubEventRosters] = useState<SubEventRoster[]>([]);
  const [subEvents, setSubEvents] = useState<SubEventRow[]>([]);
  const [subEventsLoading, setSubEventsLoading] = useState(false);
  const [subEventForm, setSubEventForm] = useState(emptySubEventForm);
  const [subEventBusy, setSubEventBusy] = useState(false);
  const [subEventError, setSubEventError] = useState<string>("");
  const [subEventSuccess, setSubEventSuccess] = useState<string>("");
  const subEventSuccessTimer = useRef<number | null>(null);

  const nineOptions = useMemo(() => {
    return nines.map((n) => ({ value: String(n.nine_id), label: n.ninename }));
  }, [nines]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    const run = async () => {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        const [eventRes, ninesRes] = await Promise.all([
          apiFetch(`/api/events/${id}`),
          apiFetch("/nines"),
        ]);
        if (!eventRes.ok) throw new Error(await eventRes.text());
        if (!ninesRes.ok) throw new Error(await ninesRes.text());

        const [eventJson, ninesJson, subEventTypesRes, subEventRostersRes] = await Promise.all([
          eventRes.json(),
          ninesRes.json(),
          apiFetch("/subevent/types"),
          apiFetch("/subevent/rosters"),
        ]);
        setEvent(eventJson);
        setNines(ninesJson);
        if (subEventTypesRes.ok) setSubEventTypes(await subEventTypesRes.json());
        if (subEventRostersRes.ok) setSubEventRosters(await subEventRostersRes.json());
        setForm({
          eventname: eventJson.eventname ?? "",
          start_dt: toInputDate(eventJson.start_dt),
          end_dt: toInputDate(eventJson.end_dt),
          nine_id: eventJson.nine_id ? String(eventJson.nine_id) : "",
          handicap_yn: Boolean(Number(eventJson.handicap_yn ?? 0)),
        });
      } catch (err: any) {
        setError(String(err?.message || "Failed to load event"));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  useEffect(() => {
    const loadSubEvents = async () => {
      if (!id) return;
      setSubEventsLoading(true);
      try {
        const res = await apiFetch(`/subevents?event=${id}`);
        if (!res.ok) throw new Error(await res.text());
        setSubEvents(await res.json());
      } catch {
        setSubEvents([]);
      } finally {
        setSubEventsLoading(false);
      }
    };
    loadSubEvents();
  }, [id]);

  async function submit() {
    if (!id) return;
    setBusy(true);
    setError("");
    setSaveSuccess("");
    try {
      const payload: any = {
        eventname: form.eventname.trim(),
        start_dt: form.start_dt ? `${form.start_dt} 00:00:00` : null,
        end_dt: form.end_dt ? `${form.end_dt} 00:00:00` : null,
        nine_id: form.nine_id ? Number(form.nine_id) : null,
        handicap_yn: form.handicap_yn ? 1 : 0,
      };

      const res = await apiFetch(`/api/events/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      if (saveSuccessTimer.current) window.clearTimeout(saveSuccessTimer.current);
      setSaveSuccess("Saved.");
      saveSuccessTimer.current = window.setTimeout(() => setSaveSuccess(""), 1000);
    } catch (err: any) {
      setError(String(err?.message || "Request failed"));
    } finally {
      setBusy(false);
    }
  }

  async function saveSubEvent() {
    if (!id) return;
    setSubEventBusy(true);
    setSubEventError("");
    setSubEventSuccess("");
    try {
      const res = await apiFetch("/subevents", {
        method: "POST",
        body: JSON.stringify({
          event_id: Number(id),
          eventtype_id: subEventForm.eventtype_id ? Number(subEventForm.eventtype_id) : null,
          roster_id: subEventForm.roster_id ? Number(subEventForm.roster_id) : null,
          amount: subEventForm.amount ? Number(subEventForm.amount) : null,
          addedmoney: subEventForm.addedmoney ? Number(subEventForm.addedmoney) : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSubEventForm(emptySubEventForm);
      try {
        const listRes = await apiFetch(`/subevents?event=${id}`);
        if (listRes.ok) setSubEvents(await listRes.json());
      } catch {
        setSubEvents([]);
      }
      if (subEventSuccessTimer.current) window.clearTimeout(subEventSuccessTimer.current);
      setSubEventSuccess("Sub event added.");
      subEventSuccessTimer.current = window.setTimeout(() => setSubEventSuccess(""), 1000);
    } catch (err: any) {
      setSubEventError(String(err?.message || "Failed to create subevent"));
    } finally {
      setSubEventBusy(false);
    }
  }

  useEffect(() => {
    return () => {
      if (subEventSuccessTimer.current) window.clearTimeout(subEventSuccessTimer.current);
      if (saveSuccessTimer.current) window.clearTimeout(saveSuccessTimer.current);
    };
  }, []);

  return (
    <div className="page">
      {error && (
        <div className="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="split">
        <div className="card">
          <h2 className="sectionTitle">Edit Event</h2>
          {loading ? (
            <div className="muted">Loading…</div>
          ) : event ? (
            <div className="form">
              <label className="formLabel">
                Event Name
                <input
                  value={form.eventname}
                  onChange={(e) => setField("eventname", e.target.value)}
                />
              </label>

              <div className="row dates">
                <label className="formLabel">
                  Start Date
                  <input
                    type="date"
                    className="dateInput"
                    value={form.start_dt}
                    onChange={(e) => setField("start_dt", e.target.value)}
                  />
                </label>
                <div className="dateSeparator">to</div>
                <div className="dateOnly">
                  <input
                    type="date"
                    className="dateInput"
                    value={form.end_dt}
                    onChange={(e) => setField("end_dt", e.target.value)}
                  />
                </div>
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
                  {busy ? "Saving…" : "Save changes"}
                </button>
                {saveSuccess ? <div className="toast success toast-inline">{saveSuccess}</div> : null}
              </div>
            </div>
          ) : (
            <div className="muted">Event not found.</div>
          )}
        </div>

        <div className="stack">
          <div className="card">
            <h2 className="sectionTitle">Sub Events</h2>
            {subEventsLoading ? (
              <div className="muted">Loading…</div>
            ) : subEvents.length ? (
              <div className="subEventList">
                {subEvents.map((sub) => (
                  <Link key={sub.subevent_id} className="subEventLink" to={`/subevents/${sub.subevent_id}`}>
                    {sub.eventtypename ?? `Sub Event #${sub.subevent_id}`}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="muted">No sub events yet.</div>
            )}
          </div>

          <div className="card">
            <h2 className="sectionTitle">Add Sub Event</h2>
            {subEventError ? <div className="muted errorText">{subEventError}</div> : null}
            <div className="form">
              <label className="formLabel">
                Type
                <select
                  value={subEventForm.eventtype_id}
                  onChange={(e) => setSubEventForm((p) => ({ ...p, eventtype_id: e.target.value }))}
                >
                  <option value="">Select type</option>
                  {subEventTypes.map((t) => (
                    <option key={t.eventtype_id} value={String(t.eventtype_id)}>
                      {t.eventtypename ?? `Type ${t.eventtype_id}`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="formLabel">
                Roster
                <select
                  value={subEventForm.roster_id}
                  onChange={(e) => setSubEventForm((p) => ({ ...p, roster_id: e.target.value }))}
                >
                  <option value="">Select roster</option>
                  {subEventRosters.map((r) => (
                    <option key={r.roster_id} value={String(r.roster_id)}>
                      {r.rostername ?? `Roster ${r.roster_id}`}
                    </option>
                  ))}
                </select>
              </label>

              <div className="row">
                <label className="formLabel">
                  Amount per Player
                  <input
                    value={subEventForm.amount}
                    onChange={(e) => setSubEventForm((p) => ({ ...p, amount: e.target.value }))}
                  />
                </label>
                <label className="formLabel">
                  Added Money
                  <input
                    value={subEventForm.addedmoney}
                    onChange={(e) => setSubEventForm((p) => ({ ...p, addedmoney: e.target.value }))}
                  />
                </label>
              </div>

              <div className="actions">
                <button className="btn primary" onClick={saveSubEvent} disabled={subEventBusy}>
                  {subEventBusy ? "Saving…" : "Add sub event"}
                </button>
                {subEventSuccess ? <div className="toast success">{subEventSuccess}</div> : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .page { display: grid; gap: 14px; }
        .split {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        }
        .stack { display: grid; gap: 14px; }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        h2 { margin: 0; font-size: 15px; text-align: center; }
        .sectionTitle { color: #6b7280; }
        .form { display: grid; gap: 8px; }
        label { display: grid; gap: 4px; font-weight: 600; font-size: 12px; }
        .formLabel { color: #6b7280; }
        input, select { padding: 5px 6px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 11px; }
        .row { display: grid; gap: 8px; }
        .row.dates { grid-template-columns: auto auto auto; align-items: end; }
        .dateOnly { display: flex; align-items: end; height: 100%; }
        .dateInput { width: 100%; max-width: 160px; color: #111827; }
        .dateSeparator { font-size: 12px; color: #6b7280; padding-bottom: 6px; }
        .checkbox { display: flex; align-items: center; gap: 8px; }
        .checkbox input { width: 16px; height: 16px; padding: 0; }
        .actions { display: flex; gap: 8px; align-items: center; }
        .toast-inline { margin-left: 0; }
        .btn { border: 1px solid #d1d5db; background: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; }
        .btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .alert { padding: 10px 12px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; color: #991b1b; }
        .muted { color: #6b7280; font-size: 12px; }
        .errorText { color: #991b1b; }
        .toast { padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
        .toast.success { border: 1px solid #bbf7d0; background: #ecfdf3; color: #166534; }
        .subEventList { display: grid; gap: 6px; }
        .subEventLink {
          text-decoration: none;
          color: #111827;
          font-size: 12px;
          padding: 6px 8px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
        }
        .subEventLink:hover { background: #eef2ff; border-color: #c7d2fe; }
      `}</style>
    </div>
  );
}
