import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../auth";

type SubEventDetail = {
  subevent_id: number;
  event_id: number | null;
  eventname: string | null;
  eventtype_id: number | null;
  eventtypename: string | null;
  eventnumhole_id: number | null;
  roster_id: number | null;
  amount: number | null;
  addedmoney: number | null;
};

export default function SubEventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<SubEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [types, setTypes] = useState<Array<{ eventtype_id: number; eventtypename: string | null }>>([]);
  const [rosters, setRosters] = useState<Array<{ roster_id: number; rostername: string | null }>>([]);
  const [form, setForm] = useState({
    eventtype_id: "",
    eventnumhole_id: "",
    roster_id: "",
    amount: "",
    addedmoney: "",
  });

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const [detailRes, typeRes, rosterRes] = await Promise.all([
          apiFetch(`/subevents/${id}`),
          apiFetch("/subevent/types"),
          apiFetch("/subevent/rosters"),
        ]);
        if (!detailRes.ok) throw new Error(await detailRes.text());
        if (!typeRes.ok) throw new Error(await typeRes.text());
        if (!rosterRes.ok) throw new Error(await rosterRes.text());
        const detail = await detailRes.json();
        setData(detail);
        setTypes(await typeRes.json());
        setRosters(await rosterRes.json());
        setForm({
          eventtype_id: detail.eventtype_id ? String(detail.eventtype_id) : "",
          eventnumhole_id: detail.eventnumhole_id ? String(detail.eventnumhole_id) : "",
          roster_id: detail.roster_id ? String(detail.roster_id) : "",
          amount: detail.amount != null ? String(detail.amount) : "",
          addedmoney: detail.addedmoney != null ? String(detail.addedmoney) : "",
        });
      } catch (e: any) {
        setError(e.message ?? "Failed to load subevent");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  const save = async () => {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          eventtype_id: form.eventtype_id ? Number(form.eventtype_id) : null,
          eventnumhole_id: form.eventnumhole_id ? Number(form.eventnumhole_id) : null,
          roster_id: form.roster_id ? Number(form.roster_id) : null,
          amount: form.amount ? Number(form.amount) : null,
          addedmoney: form.addedmoney ? Number(form.addedmoney) : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e: any) {
      setError(e.message ?? "Failed to save subevent");
    } finally {
      setBusy(false);
    }
  };

  const deleteSubEvent = async () => {
    if (!id) return;
    if (!confirm("Delete this sub event?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      navigate(data?.event_id ? `/events/${data.event_id}` : "/events", { replace: true });
    } catch (e: any) {
      setError(e.message ?? "Failed to delete subevent");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="eventHeader">
        <Link className="backLink" to={data?.event_id ? `/events/${data.event_id}` : "/events"}>
          ← Back to Event
        </Link>
        <div className="eventTitle">{data?.eventname ?? "Event"}</div>
      </div>
      {loading ? <div className="muted">Loading…</div> : null}
      {error ? <div className="error">{error}</div> : null}
      {data ? (
        <div className="card">
          <div className="titleRow">
            <div className="title">
              {data.eventtypename ? `Sub Event - ${data.eventtypename}` : `Sub Event #${data.subevent_id}`}
            </div>
          </div>
          <div className="row">
            <div className="label">Event</div>
            <div className="value">{data.eventname ?? data.event_id ?? "—"}</div>
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
            <div className="actionsLeft">
              <button className="btn" type="button">
                Calculate Winnings
              </button>
            </div>
            <div className="actionsRight">
              <button className="btn primary" onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </button>
              <button className="btn danger" onClick={deleteSubEvent} disabled={busy} aria-label="Delete sub event">
                🗑
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
        .btn.danger { background: #fff; color: #374151; border-color: #d1d5db; }
        .actionsRow { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; justify-content: space-between; align-items: center; }
        .actionsLeft, .actionsRight { display: flex; gap: 8px; align-items: center; }
        .muted { color: #6b7280; font-size: 12px; }
        .error { color: #a00; font-size: 12px; }
      `}</style>
    </div>
  );
}
