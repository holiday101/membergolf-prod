import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

function toInputDate(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function EditEventPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [nines, setNines] = useState<Nine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

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

        const [eventJson, ninesJson] = await Promise.all([
          eventRes.json(),
          ninesRes.json(),
        ]);
        setEvent(eventJson);
        setNines(ninesJson);
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

  async function submit() {
    if (!id) return;
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

      const res = await apiFetch(`/api/events/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      navigate("/events", { replace: true });
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
            </div>
          </div>
        ) : (
          <div className="muted">Event not found.</div>
        )}
      </div>

      <style>{`
        .page { display: grid; gap: 14px; }
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
        .actions { display: flex; gap: 8px; }
        .btn { border: 1px solid #d1d5db; background: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; }
        .btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .alert { padding: 10px 12px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; color: #991b1b; }
        .muted { color: #6b7280; font-size: 12px; }
      `}</style>
    </div>
  );
}
