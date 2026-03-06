import { useEffect, useMemo, useState } from "react";
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

type ChicagoRow = {
  chicago_id: number;
  card_id: number | null;
  member_id: number | null;
  firstname: string | null;
  lastname: string | null;
  flight_id: number | null;
  flightname: string | null;
  score: number | null;
  place: number | null;
  amount: number | null;
  used_yn: number | null;
};

type PayoutRow = {
  place: number | null;
  amount: number | null;
  flight_id: number | null;
  flightname: string | null;
};

function isChicagoType(name: string | null | undefined) {
  return (name ?? "").toLowerCase().includes("chicago");
}

export default function SubEventChicagoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<SubEventDetail | null>(null);
  const [types, setTypes] = useState<Array<{ eventtype_id: number; eventtypename: string | null }>>([]);
  const [rosters, setRosters] = useState<Array<{ roster_id: number; rostername: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [chicagoLoading, setChicagoLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [chicagoBusy, setChicagoBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [rows, setRows] = useState<ChicagoRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [amountEdits, setAmountEdits] = useState<Record<number, string>>({});
  const [form, setForm] = useState({
    eventtype_id: "",
    eventnumhole_id: "",
    roster_id: "",
    amount: "",
    addedmoney: "",
  });

  const groupedPayouts = useMemo(() => {
    const groups = new Map<string, PayoutRow[]>();
    for (const row of payouts) {
      const key = String(row.flight_id ?? "na");
      const arr = groups.get(key) ?? [];
      arr.push(row);
      groups.set(key, arr);
    }
    return Array.from(groups.entries()).map(([key, flightRows]) => ({
      flight_id: key === "na" ? null : Number(key),
      flightname: flightRows.find((r) => (r.flightname ?? "").trim())?.flightname ?? null,
      rows: flightRows,
    }));
  }, [payouts]);

  const loadChicago = async () => {
    if (!id) return;
    setChicagoLoading(true);
    try {
      const res = await apiFetch(`/subevents/${id}/chicago`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const chicagoRows = (json.rows ?? []) as ChicagoRow[];
      setRows(chicagoRows);
      setPayouts((json.payouts ?? []) as PayoutRow[]);

      const edits: Record<number, string> = {};
      for (const row of chicagoRows) {
        edits[row.chicago_id] = row.amount != null ? String(row.amount) : "";
      }
      setAmountEdits(edits);
    } catch (e: any) {
      setError(e.message ?? "Failed to load Chicago payouts");
      setRows([]);
      setPayouts([]);
      setAmountEdits({});
    } finally {
      setChicagoLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      if (!id) return;
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

        const detail = (await detailRes.json()) as SubEventDetail;
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

  useEffect(() => {
    if (data && isChicagoType(data.eventtypename)) {
      loadChicago();
    }
  }, [id, data?.eventtypename]);

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
    if (!window.confirm("Delete this sub event?")) return;
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

  const postChicago = async () => {
    if (!id) return;
    setChicagoBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}/chicago/post`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      await loadChicago();
    } catch (e: any) {
      setError(e.message ?? "Failed to post Chicago payouts");
    } finally {
      setChicagoBusy(false);
    }
  };

  const unpostChicago = async () => {
    if (!id) return;
    setChicagoBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}/chicago/unpost`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      await loadChicago();
    } catch (e: any) {
      setError(e.message ?? "Failed to un-post Chicago payouts");
    } finally {
      setChicagoBusy(false);
    }
  };

  const updateAmount = async (chicagoId: number) => {
    if (!id) return;
    const raw = (amountEdits[chicagoId] ?? "").trim();
    const amount = raw === "" ? null : Number(raw);
    if (raw !== "" && !Number.isFinite(amount)) {
      setError("Invalid amount");
      return;
    }

    setChicagoBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}/chicago/${chicagoId}`, {
        method: "PATCH",
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadChicago();
    } catch (e: any) {
      setError(e.message ?? "Failed to update amount");
    } finally {
      setChicagoBusy(false);
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
        <>
          <div className="card">
            <div className="titleRow">
              <div className="title">{data.eventtypename ? `Sub Event - ${data.eventtypename}` : `Sub Event #${data.subevent_id}`}</div>
            </div>

            <div className="row">
              <div className="label">Event</div>
              <div className="value">{data.eventname ?? data.event_id ?? "—"}</div>
            </div>

            <div className="row">
              <div className="label">Type</div>
              <select
                value={form.eventtype_id}
                onChange={(e) => setForm((prev) => ({ ...prev, eventtype_id: e.target.value }))}
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
                onChange={(e) => setForm((prev) => ({ ...prev, roster_id: e.target.value }))}
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
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div className="row">
              <div className="label">Added Money</div>
              <input
                value={form.addedmoney}
                onChange={(e) => setForm((prev) => ({ ...prev, addedmoney: e.target.value }))}
              />
            </div>

            <div className="actionsRow">
              <div className="actionsLeft" />
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

          {isChicagoType(data.eventtypename) ? (
            <div className="card wideCard">
              <div className="titleRow">
                <div className="title">Chicago</div>
                <div className="actionsRight">
                  <button className="btn" onClick={unpostChicago} disabled={chicagoBusy}>
                    {chicagoBusy ? "Working…" : "Un-Post Scores"}
                  </button>
                  <button className="btn primary" onClick={postChicago} disabled={chicagoBusy}>
                    {chicagoBusy ? "Working…" : "Post Chicago"}
                  </button>
                </div>
              </div>

              {chicagoLoading ? <div className="muted">Loading Chicago payouts…</div> : null}

              {!chicagoLoading ? (
                <>
                  <div className="chicagoTable">
                    <div className="chicagoHead">
                      <span>Flight</span>
                      <span>Member</span>
                      <span>Score</span>
                      <span>Place</span>
                      <span>Amount</span>
                      <span />
                    </div>
                    {rows.map((row) => (
                      <div key={row.chicago_id} className="chicagoRow">
                        <span>{row.flightname ?? row.flight_id ?? "—"}</span>
                        <span>{(row.lastname || "").trim()}, {(row.firstname || "").trim()}</span>
                        <span>{row.score ?? "—"}</span>
                        <span>{row.place ?? "—"}</span>
                        <input
                          value={amountEdits[row.chicago_id] ?? ""}
                          onChange={(e) =>
                            setAmountEdits((prev) => ({
                              ...prev,
                              [row.chicago_id]: e.target.value,
                            }))
                          }
                        />
                        <button className="btn" onClick={() => updateAmount(row.chicago_id)} disabled={chicagoBusy}>
                          Save
                        </button>
                      </div>
                    ))}
                    {!rows.length ? <div className="muted">No Chicago results posted yet.</div> : null}
                  </div>

                  {groupedPayouts.length ? (
                    <div className="payoutsTable">
                      <div className="title">Payout Table</div>
                      {groupedPayouts.map((group, idx) => (
                        <div key={`${group.flight_id ?? "na"}-${idx}`} className="payoutGroup">
                          <div className="payoutFlight">{group.flightname ?? (group.flight_id != null ? `Flight ${group.flight_id}` : "All Flights")}</div>
                          <div className="payoutHead">
                            <span>Place</span>
                            <span>Amount</span>
                          </div>
                          {group.rows.map((row, rowIdx) => (
                            <div key={`${idx}-${rowIdx}`} className="payoutRow">
                              <span>{row.place ?? "—"}</span>
                              <span>{row.amount != null ? Number(row.amount).toFixed(2) : "—"}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      <style>{`
        .eventHeader { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .eventTitle { font-size: 20px; font-weight: 700; color: #111827; }
        .backLink { color: #2563eb; text-decoration: none; font-size: 13px; }
        .backLink:hover { text-decoration: underline; }

        .card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px;
          display: grid;
          gap: 8px;
        }
        .wideCard { margin-top: 12px; }
        .titleRow { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .title { font-size: 16px; font-weight: 700; color: #111827; }

        .row {
          display: grid;
          grid-template-columns: 130px 1fr;
          gap: 8px;
          align-items: center;
        }
        .label { font-size: 12px; color: #6b7280; }
        .value { font-size: 13px; color: #111827; }
        select, input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 7px 9px;
          font-size: 13px;
          background: #fff;
        }

        .actionsRow { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
        .actionsLeft { min-height: 1px; }
        .actionsRight { display: flex; align-items: center; gap: 8px; }

        .btn {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: #fff;
          color: #111827;
          padding: 7px 10px;
          font-size: 12px;
          cursor: pointer;
        }
        .btn:hover { background: #f9fafb; }
        .btn.primary { border-color: #1d4ed8; background: #1d4ed8; color: #fff; }
        .btn.primary:hover { background: #1e40af; }
        .btn.danger { border-color: #ef4444; color: #ef4444; }
        .btn:disabled { opacity: 0.6; cursor: default; }

        .chicagoTable { display: grid; gap: 8px; margin-top: 8px; }
        .chicagoHead,
        .chicagoRow {
          display: grid;
          grid-template-columns: 1fr 1.5fr 80px 80px 120px 74px;
          gap: 8px;
          align-items: center;
        }
        .chicagoHead {
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
        }
        .chicagoRow {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 8px;
          font-size: 12px;
          color: #111827;
        }

        .payoutsTable {
          margin-top: 12px;
          border-top: 1px solid #e5e7eb;
          padding-top: 12px;
          display: grid;
          gap: 8px;
        }
        .payoutGroup {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 8px;
          display: grid;
          gap: 6px;
          background: #fafafa;
        }
        .payoutFlight { font-size: 12px; font-weight: 700; color: #1f2937; }
        .payoutHead,
        .payoutRow {
          display: grid;
          grid-template-columns: 100px 120px;
          gap: 8px;
          font-size: 12px;
        }
        .payoutHead {
          color: #6b7280;
          text-transform: uppercase;
          font-size: 11px;
          font-weight: 700;
        }

        .muted { color: #6b7280; font-size: 12px; }
        .error {
          color: #b91c1c;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 8px 10px;
          margin-bottom: 8px;
          font-size: 12px;
        }

        @media (max-width: 980px) {
          .chicagoHead { display: none; }
          .chicagoRow { grid-template-columns: 1fr; gap: 6px; }
          .row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
