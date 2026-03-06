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

type PairingOption = {
  card_id: number;
  member_id: number | null;
  firstname: string | null;
  lastname: string | null;
  handicap: number | null;
  flight_id: number | null;
  flightname: string | null;
};

type PairingRow = {
  bestball_id: number;
  card1_id: number | null;
  card2_id: number | null;
  member1_id: number | null;
  member2_id: number | null;
  member1_firstname: string | null;
  member1_lastname: string | null;
  member2_firstname: string | null;
  member2_lastname: string | null;
  handicap1: number | null;
  handicap2: number | null;
  handicap: number | null;
  gross: number | null;
  net: number | null;
  flight_id: number | null;
  flightname: string | null;
};

type GrossRow = {
  gross_id: number;
  bestball_id: number | null;
  flight_id: number | null;
  flightname: string | null;
  score: number | null;
  place: number | null;
  amount: number | null;
  used_yn: number | null;
  member1_firstname: string | null;
  member1_lastname: string | null;
  member2_firstname: string | null;
  member2_lastname: string | null;
};

type NetRow = {
  net_id: number;
  bestball_id: number | null;
  flight_id: number | null;
  flightname: string | null;
  score: number | null;
  place: number | null;
  amount: number | null;
  used_yn: number | null;
  member1_firstname: string | null;
  member1_lastname: string | null;
  member2_firstname: string | null;
  member2_lastname: string | null;
};

type PayoutRow = {
  place: number | null;
  amount: number | null;
  flight_id: number | null;
  flightname: string | null;
};

function isBestBallType(name: string | null | undefined) {
  const normalized = (name ?? "").toLowerCase();
  return normalized.includes("best ball") || normalized.includes("bestball");
}

function memberName(lastname: string | null | undefined, firstname: string | null | undefined) {
  const last = (lastname ?? "").trim();
  const first = (firstname ?? "").trim();
  if (last || first) return `${last}${last && first ? ", " : ""}${first}`;
  return "Unknown";
}

export default function SubEventBestBallPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<SubEventDetail | null>(null);
  const [types, setTypes] = useState<Array<{ eventtype_id: number; eventtypename: string | null }>>([]);
  const [rosters, setRosters] = useState<Array<{ roster_id: number; rostername: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bestBallBusy, setBestBallBusy] = useState(false);
  const [bestBallLoading, setBestBallLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [pairingOptions, setPairingOptions] = useState<PairingOption[]>([]);
  const [pairings, setPairings] = useState<PairingRow[]>([]);
  const [gross, setGross] = useState<GrossRow[]>([]);
  const [net, setNet] = useState<NetRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [grossAmountEdits, setGrossAmountEdits] = useState<Record<number, string>>({});
  const [netAmountEdits, setNetAmountEdits] = useState<Record<number, string>>({});

  const [pairingForm, setPairingForm] = useState({ card1_id: "", card2_id: "" });
  const [form, setForm] = useState({
    eventtype_id: "",
    eventnumhole_id: "",
    roster_id: "",
    amount: "",
    addedmoney: "",
  });

  const loadBestBall = async () => {
    if (!id) return;
    setBestBallLoading(true);
    try {
      const res = await apiFetch(`/subevents/${id}/bestball`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const grossRows = (json.gross ?? []) as GrossRow[];
      const netRows = (json.net ?? []) as NetRow[];
      setPairings((json.pairings ?? []) as PairingRow[]);
      setPairingOptions((json.cards ?? []) as PairingOption[]);
      setGross(grossRows);
      setNet(netRows);
      setPayouts((json.payouts ?? []) as PayoutRow[]);

      const nextGrossEdits: Record<number, string> = {};
      for (const row of grossRows) nextGrossEdits[row.gross_id] = row.amount != null ? String(row.amount) : "";
      setGrossAmountEdits(nextGrossEdits);

      const nextNetEdits: Record<number, string> = {};
      for (const row of netRows) nextNetEdits[row.net_id] = row.amount != null ? String(row.amount) : "";
      setNetAmountEdits(nextNetEdits);
    } catch (e: any) {
      setError(e.message ?? "Failed to load best ball data");
      setPairings([]);
      setPairingOptions([]);
      setGross([]);
      setNet([]);
      setPayouts([]);
      setGrossAmountEdits({});
      setNetAmountEdits({});
    } finally {
      setBestBallLoading(false);
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
    if (!data || !isBestBallType(data.eventtypename)) return;
    loadBestBall();
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

  const addPairing = async () => {
    if (!id) return;
    const card1 = Number(pairingForm.card1_id);
    const card2 = Number(pairingForm.card2_id);
    if (!Number.isFinite(card1) || !Number.isFinite(card2)) {
      setError("Select both cards for the pairing");
      return;
    }
    if (card1 === card2) {
      setError("Pairings require two different cards");
      return;
    }

    setBestBallBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}/bestball/pairings`, {
        method: "POST",
        body: JSON.stringify({ card1_id: card1, card2_id: card2 }),
      });
      if (!res.ok) throw new Error(await res.text());
      setPairingForm({ card1_id: "", card2_id: "" });
      await loadBestBall();
    } catch (e: any) {
      setError(e.message ?? "Failed to add pairing");
    } finally {
      setBestBallBusy(false);
    }
  };

  const removePairing = async (bestballId: number) => {
    if (!id) return;
    if (!window.confirm("Delete this pairing?")) return;
    setBestBallBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}/bestball/pairings/${bestballId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await loadBestBall();
    } catch (e: any) {
      setError(e.message ?? "Failed to delete pairing");
    } finally {
      setBestBallBusy(false);
    }
  };

  const postBestBall = async () => {
    if (!id) return;
    setBestBallBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}/bestball/post`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      await loadBestBall();
    } catch (e: any) {
      setError(e.message ?? "Failed to post best ball");
    } finally {
      setBestBallBusy(false);
    }
  };

  const unpostBestBall = async () => {
    if (!id) return;
    setBestBallBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}/bestball/unpost`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      await loadBestBall();
    } catch (e: any) {
      setError(e.message ?? "Failed to un-post best ball");
    } finally {
      setBestBallBusy(false);
    }
  };

  const saveGrossAmount = async (grossId: number) => {
    if (!id) return;
    const raw = (grossAmountEdits[grossId] ?? "").trim();
    const amount = raw === "" ? null : Number(raw);
    if (raw !== "" && !Number.isFinite(amount)) {
      setError("Invalid gross amount");
      return;
    }

    setBestBallBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}/bestball/gross/${grossId}`, {
        method: "PATCH",
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadBestBall();
    } catch (e: any) {
      setError(e.message ?? "Failed to save gross amount");
    } finally {
      setBestBallBusy(false);
    }
  };

  const saveNetAmount = async (netId: number) => {
    if (!id) return;
    const raw = (netAmountEdits[netId] ?? "").trim();
    const amount = raw === "" ? null : Number(raw);
    if (raw !== "" && !Number.isFinite(amount)) {
      setError("Invalid net amount");
      return;
    }

    setBestBallBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}/bestball/net/${netId}`, {
        method: "PATCH",
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadBestBall();
    } catch (e: any) {
      setError(e.message ?? "Failed to save net amount");
    } finally {
      setBestBallBusy(false);
    }
  };

  const cardOptionLabel = (card: PairingOption) => {
    const name = memberName(card.lastname, card.firstname);
    const handicap = card.handicap != null ? `HDCP ${card.handicap}` : "HDCP —";
    return `${name} (${handicap})`;
  };

  const payoutsByFlight = useMemo(() => {
    const grouped = new Map<string, PayoutRow[]>();
    for (const row of payouts) {
      const key = String(row.flight_id ?? "na") + "::" + String(row.flightname ?? "Unassigned");
      const existing = grouped.get(key) ?? [];
      existing.push(row);
      grouped.set(key, existing);
    }
    return Array.from(grouped.entries()).map(([key, rows]) => {
      const parts = key.split("::");
      return {
        flight_id: parts[0] === "na" ? null : Number(parts[0]),
        flightname: parts.slice(1).join("::") || null,
        rows,
      };
    });
  }, [payouts]);

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
              <div className="title">
                {data.eventtypename ? `Sub Event - ${data.eventtypename}` : `Sub Event #${data.subevent_id}`}
              </div>
            </div>

            {!isBestBallType(data.eventtypename) ? (
              <div className="warning">This sub event is not currently a Best Ball type.</div>
            ) : null}

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
                {types.map((type) => (
                  <option key={type.eventtype_id} value={String(type.eventtype_id)}>
                    {type.eventtypename ?? `Type ${type.eventtype_id}`}
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
                {rosters.map((roster) => (
                  <option key={roster.roster_id} value={String(roster.roster_id)}>
                    {roster.rostername ?? `Roster ${roster.roster_id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="row">
              <div className="label">Amount per Player</div>
              <input value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} />
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

          <div className="card wideCard">
            <div className="titleRow">
              <div className="title">Best Ball Pairings</div>
              <div className="actionsRight">
                <button className="btn" onClick={unpostBestBall} disabled={bestBallBusy}>
                  {bestBallBusy ? "Working…" : "Un-Post Scores"}
                </button>
                <button className="btn primary" onClick={postBestBall} disabled={bestBallBusy}>
                  {bestBallBusy ? "Working…" : "Post Best Ball"}
                </button>
              </div>
            </div>

            <div className="pairingEditor">
              <select
                value={pairingForm.card1_id}
                onChange={(e) => setPairingForm((prev) => ({ ...prev, card1_id: e.target.value }))}
              >
                <option value="">Select player 1</option>
                {pairingOptions.map((card) => (
                  <option key={`card1-${card.card_id}`} value={String(card.card_id)}>
                    {cardOptionLabel(card)}
                  </option>
                ))}
              </select>
              <select
                value={pairingForm.card2_id}
                onChange={(e) => setPairingForm((prev) => ({ ...prev, card2_id: e.target.value }))}
              >
                <option value="">Select player 2</option>
                {pairingOptions.map((card) => (
                  <option key={`card2-${card.card_id}`} value={String(card.card_id)}>
                    {cardOptionLabel(card)}
                  </option>
                ))}
              </select>
              <button className="btn primary" onClick={addPairing} disabled={bestBallBusy || bestBallLoading}>
                Add Pairing
              </button>
            </div>

            {bestBallLoading ? <div className="muted">Loading best ball…</div> : null}

            {!bestBallLoading ? (
              <div className="tableWrap">
                <div className="tableHead pairingsHead">
                  <span>Team</span>
                  <span>Cards</span>
                  <span>Handicap</span>
                  <span>Gross</span>
                  <span>Net</span>
                  <span>Flight</span>
                  <span />
                </div>
                {pairings.map((row) => (
                  <div className="tableRow pairingsRow" key={row.bestball_id}>
                    <span>
                      {memberName(row.member1_lastname, row.member1_firstname)} / {memberName(row.member2_lastname, row.member2_firstname)}
                    </span>
                    <span>
                      #{row.card1_id ?? "—"} + #{row.card2_id ?? "—"}
                    </span>
                    <span>{row.handicap != null ? Number(row.handicap).toFixed(2) : "—"}</span>
                    <span>{row.gross ?? "—"}</span>
                    <span>{row.net ?? "—"}</span>
                    <span>{row.flightname ?? row.flight_id ?? "—"}</span>
                    <span>
                      <button className="btn danger mini" onClick={() => removePairing(row.bestball_id)} disabled={bestBallBusy}>
                        Remove
                      </button>
                    </span>
                  </div>
                ))}
                {pairings.length === 0 ? <div className="muted">No pairings yet.</div> : null}
              </div>
            ) : null}
          </div>

          <div className="card wideCard">
            <div className="title">Best Ball Payouts</div>

            {payoutsByFlight.length ? (
              <div className="payoutGrid">
                {payoutsByFlight.map((group) => (
                  <div className="payoutCard" key={`payout-${group.flight_id ?? "na"}-${group.flightname ?? ""}`}>
                    <div className="payoutTitle">{group.flightname ?? group.flight_id ?? "Unassigned"}</div>
                    {group.rows.map((row, idx) => (
                      <div className="payoutRow" key={`payout-${group.flight_id ?? "na"}-${idx}`}>
                        <span>Place {row.place ?? "—"}</span>
                        <span>{row.amount != null ? Number(row.amount).toFixed(2) : "—"}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="muted">No payout rows yet.</div>
            )}

            <div className="splitTables">
              <div>
                <div className="tableTitle">Gross</div>
                <div className="tableHead payHead">
                  <span>Team</span>
                  <span>Score</span>
                  <span>Place</span>
                  <span>Amount</span>
                  <span />
                </div>
                {gross.map((row) => (
                  <div className="tableRow payRow" key={row.gross_id}>
                    <span>
                      {memberName(row.member1_lastname, row.member1_firstname)} / {memberName(row.member2_lastname, row.member2_firstname)}
                    </span>
                    <span>{row.score ?? "—"}</span>
                    <span>{row.place ?? "—"}</span>
                    <span>
                      <input
                        value={grossAmountEdits[row.gross_id] ?? ""}
                        onChange={(e) => setGrossAmountEdits((prev) => ({ ...prev, [row.gross_id]: e.target.value }))}
                      />
                    </span>
                    <span>
                      <button className="btn" onClick={() => saveGrossAmount(row.gross_id)} disabled={bestBallBusy}>
                        Save
                      </button>
                    </span>
                  </div>
                ))}
                {gross.length === 0 ? <div className="muted">No gross rows.</div> : null}
              </div>

              <div>
                <div className="tableTitle">Net</div>
                <div className="tableHead payHead">
                  <span>Team</span>
                  <span>Score</span>
                  <span>Place</span>
                  <span>Amount</span>
                  <span />
                </div>
                {net.map((row) => (
                  <div className="tableRow payRow" key={row.net_id}>
                    <span>
                      {memberName(row.member1_lastname, row.member1_firstname)} / {memberName(row.member2_lastname, row.member2_firstname)}
                    </span>
                    <span>{row.score ?? "—"}</span>
                    <span>{row.place ?? "—"}</span>
                    <span>
                      <input
                        value={netAmountEdits[row.net_id] ?? ""}
                        onChange={(e) => setNetAmountEdits((prev) => ({ ...prev, [row.net_id]: e.target.value }))}
                      />
                    </span>
                    <span>
                      <button className="btn" onClick={() => saveNetAmount(row.net_id)} disabled={bestBallBusy}>
                        Save
                      </button>
                    </span>
                  </div>
                ))}
                {net.length === 0 ? <div className="muted">No net rows.</div> : null}
              </div>
            </div>
          </div>
        </>
      ) : null}

      <style>{`
        .page { display: grid; gap: 12px; }
        .eventHeader { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .backLink { color: #2563eb; text-decoration: none; font-weight: 600; }
        .eventTitle { font-size: 20px; font-weight: 800; color: #111827; }
        .card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px;
          display: grid;
          gap: 10px;
        }
        .wideCard { overflow: hidden; }
        .titleRow { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .title { font-size: 16px; font-weight: 800; color: #111827; }
        .label { font-size: 12px; font-weight: 700; color: #4b5563; }
        .value { font-size: 13px; color: #111827; }
        .row { display: grid; grid-template-columns: 150px minmax(0, 1fr); align-items: center; gap: 10px; }
        .row input, .row select, .pairingEditor select, .payRow input {
          height: 32px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 0 8px;
          font-size: 13px;
          width: 100%;
          min-width: 0;
        }
        .actionsRow { display: flex; justify-content: space-between; align-items: center; }
        .actionsLeft, .actionsRight { display: flex; gap: 8px; align-items: center; }
        .btn {
          border: 1px solid #d1d5db;
          background: #fff;
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 700;
          color: #111827;
          cursor: pointer;
        }
        .btn:hover { background: #f8fafc; }
        .btn.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
        .btn.primary:hover { background: #1d4ed8; }
        .btn.danger { border-color: #ef4444; color: #ef4444; background: #fff; }
        .btn.danger:hover { background: #fef2f2; }
        .btn.mini { padding: 5px 8px; font-size: 11px; }
        .warning {
          background: #fffbeb;
          color: #92400e;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          font-size: 12px;
          padding: 8px;
        }
        .pairingEditor {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
          gap: 8px;
          align-items: center;
        }
        .tableWrap, .splitTables { display: grid; gap: 6px; }
        .splitTables { grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
        .tableHead, .tableRow {
          display: grid;
          align-items: center;
          gap: 8px;
          font-size: 12px;
        }
        .pairingsHead, .pairingsRow { grid-template-columns: 1.7fr 0.8fr 0.6fr 0.5fr 0.5fr 0.8fr 80px; }
        .payHead, .payRow { grid-template-columns: 1.6fr 0.5fr 0.5fr minmax(80px, 1fr) 70px; }
        .tableHead {
          color: #6b7280;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.04em;
        }
        .tableRow {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 6px 8px;
        }
        .tableTitle { font-size: 13px; font-weight: 800; color: #111827; margin-bottom: 4px; }
        .payoutGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 8px;
        }
        .payoutCard {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 8px;
          background: #f8fafc;
          display: grid;
          gap: 6px;
        }
        .payoutTitle { font-weight: 700; color: #111827; }
        .payoutRow {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #374151;
        }
        .muted { color: #6b7280; font-size: 12px; }
        .error {
          color: #991b1b;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 8px;
          font-size: 12px;
        }
        @media (max-width: 900px) {
          .row { grid-template-columns: 1fr; }
          .pairingEditor { grid-template-columns: 1fr; }
          .splitTables { grid-template-columns: 1fr; }
          .pairingsHead, .payHead { display: none; }
          .pairingsRow, .payRow { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
