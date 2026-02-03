import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../auth";

type EventRow = {
  event_id: number;
  eventname: string | null;
};

export default function SubEventCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventParam = searchParams.get("event");
  const eventId = eventParam ? Number(eventParam) : null;

  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [types, setTypes] = useState<Array<{ eventtype_id: number; eventtypename: string | null }>>([]);
  const [rosters, setRosters] = useState<Array<{ roster_id: number; rostername: string | null }>>([]);
  const [form, setForm] = useState({
    eventtype_id: "",
    roster_id: "",
    amount: "",
    addedmoney: "",
  });

  useEffect(() => {
    const run = async () => {
      if (!eventId || !Number.isFinite(eventId)) {
        setError("Missing event id.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const [eventRes, typeRes, rosterRes] = await Promise.all([
          apiFetch(`/api/events/${eventId}`),
          apiFetch("/subevent/types"),
          apiFetch("/subevent/rosters"),
        ]);
        if (!eventRes.ok) throw new Error(await eventRes.text());
        if (!typeRes.ok) throw new Error(await typeRes.text());
        if (!rosterRes.ok) throw new Error(await rosterRes.text());
        setEvent(await eventRes.json());
        setTypes(await typeRes.json());
        setRosters(await rosterRes.json());
      } catch (e: any) {
        setError(e.message ?? "Failed to load subevent data");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [eventId]);

  const save = async () => {
    if (!eventId) return;
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch("/subevents", {
        method: "POST",
        body: JSON.stringify({
          event_id: eventId,
          eventtype_id: form.eventtype_id ? Number(form.eventtype_id) : null,
          roster_id: form.roster_id ? Number(form.roster_id) : null,
          amount: form.amount ? Number(form.amount) : null,
          addedmoney: form.addedmoney ? Number(form.addedmoney) : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      navigate(`/subevents/${data.id}`, { replace: true });
    } catch (e: any) {
      setError(e.message ?? "Failed to create subevent");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="eventHeader">
        <Link className="backLink" to={eventId ? `/events/${eventId}` : "/events"}>
          ← Back to Event
        </Link>
        <div className="eventTitle">{event?.eventname ?? "Event"}</div>
      </div>
      {loading ? <div className="muted">Loading…</div> : null}
      {error ? <div className="error">{error}</div> : null}
      <div className="card">
        <div className="titleRow">
          <div className="title">Add Sub Event</div>
        </div>
        <div className="row">
          <div className="label">Event</div>
          <div className="value">{event?.eventname ?? eventId ?? "—"}</div>
        </div>
        <div className="row">
          <div className="label">Type</div>
          <select
            value={form.eventtype_id}
            onChange={(e) => setForm((p) => ({ ...p, eventtype_id: e.target.value }))}
          >
            <option value="">Select type</option>
            {types.map((t) => (
              <option key={t.eventtype_id} value={String(t.eventtype_id)}>
                {t.eventtypename ?? `Type ${t.eventtype_id}`}
              </option>
            ))}
          </select>
        </div>
        <div className="row">
          <div className="label">Roster</div>
          <select
            value={form.roster_id}
            onChange={(e) => setForm((p) => ({ ...p, roster_id: e.target.value }))}
          >
            <option value="">Select roster</option>
            {rosters.map((r) => (
              <option key={r.roster_id} value={String(r.roster_id)}>
                {r.rostername ?? `Roster ${r.roster_id}`}
              </option>
            ))}
          </select>
        </div>
        <div className="row">
          <div className="label">Amount per Player</div>
          <input
            value={form.amount}
            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
          />
        </div>
        <div className="row">
          <div className="label">Added Money</div>
          <input
            value={form.addedmoney}
            onChange={(e) => setForm((p) => ({ ...p, addedmoney: e.target.value }))}
          />
        </div>
        <div className="actionsRow">
          <button className="btn primary" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      <style>{`
        .page { display: grid; gap: 12px; }
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
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; max-width: 520px; }
        .titleRow { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
        .title { font-size: 16px; font-weight: 700; color: #111827; }
        .row { display: grid; grid-template-columns: 120px 1fr; gap: 10px; padding: 4px 0; }
        .label { color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
        .value { color: #374151; font-size: 12px; }
        input, select { padding: 6px 8px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 12px; }
        .btn {
          border: 1px solid #d1d5db;
          background: #fff;
          padding: 6px 10px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
        }
        .btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .actionsRow { display: flex; gap: 8px; margin-top: 10px; justify-content: flex-end; }
        .muted { color: #6b7280; font-size: 12px; }
        .error { color: #a00; font-size: 12px; }
      `}</style>
    </div>
  );
}
