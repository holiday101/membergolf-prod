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
  card_dt: string | null;
  gross: number | null;
  net: number | null;
};

type PairingRow = {
  bestball_id: number;
  card1_id: number | null;
  card2_id: number | null;
  member1_firstname: string | null;
  member1_lastname: string | null;
  member2_firstname: string | null;
  member2_lastname: string | null;
  handicap: number | null;
  gross: number | null;
  net: number | null;
  flightname: string | null;
  flight_id: number | null;
};

type GrossRow = {
  gross_id: number;
  bestball_id: number | null;
  flight_id: number | null;
  flightname: string | null;
  member1_firstname: string | null;
  member1_lastname: string | null;
  member2_firstname: string | null;
  member2_lastname: string | null;
  score: number | null;
  place: number | null;
  amount: number | null;
};

type NetRow = {
  net_id: number;
  bestball_id: number | null;
  flight_id: number | null;
  flightname: string | null;
  member1_firstname: string | null;
  member1_lastname: string | null;
  member2_firstname: string | null;
  member2_lastname: string | null;
  score: number | null;
  place: number | null;
  amount: number | null;
};

type PayoutRow = {
  place: number | null;
  amount: number | null;
  flightname: string | null;
  flight_id: number | null;
};

function isBestBallType(name: string | null | undefined) {
  const normalized = (name ?? "").toLowerCase();
  return normalized.includes("best ball") || normalized.includes("bestball");
}

function hasWinningAmount(amount: number | string | null | undefined) {
  const n = typeof amount === "number" ? amount : Number(amount ?? 0);
  return Number.isFinite(n) && n > 0;
}

function memberName(last: string | null | undefined, first: string | null | undefined) {
  const l = (last ?? "").trim();
  const f = (first ?? "").trim();
  if (!l && !f) return "Unknown";
  return l + (l && f ? ", " : "") + f;
}

function pairName(
  member1Last: string | null | undefined,
  member1First: string | null | undefined,
  member2Last: string | null | undefined,
  member2First: string | null | undefined
) {
  return `${memberName(member1Last, member1First)} / ${memberName(member2Last, member2First)}`;
}

function formatCardDate(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

export default function SubEventBestBallPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<SubEventDetail | null>(null);
  const [types, setTypes] = useState<Array<{ eventtype_id: number; eventtypename: string | null }>>([]);
  const [rosters, setRosters] = useState<Array<{ roster_id: number; rostername: string | null }>>([]);
  const [form, setForm] = useState({ eventtype_id: "", roster_id: "", amount: "", addedmoney: "" });

  const [cards, setCards] = useState<PairingOption[]>([]);
  const [pairings, setPairings] = useState<PairingRow[]>([]);
  const [gross, setGross] = useState<GrossRow[]>([]);
  const [net, setNet] = useState<NetRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);

  const [pairingForm, setPairingForm] = useState({ card1_id: "", card2_id: "" });
  const [grossAmountEdits, setGrossAmountEdits] = useState<Record<number, string>>({});
  const [netAmountEdits, setNetAmountEdits] = useState<Record<number, string>>({});

  const [loading, setLoading] = useState(true);
  const [bestBallLoading, setBestBallLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadBestBall = async () => {
    if (!id) return;
    setBestBallLoading(true);
    try {
      const res = await apiFetch(`/subevents/${id}/bestball`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setCards((json.cards ?? []) as PairingOption[]);
      setPairings((json.pairings ?? []) as PairingRow[]);
      const grossRows = (json.gross ?? []) as GrossRow[];
      const netRows = (json.net ?? []) as NetRow[];
      setGross(grossRows);
      setNet(netRows);
      setPayouts((json.payouts ?? []) as PayoutRow[]);

      const g: Record<number, string> = {};
      for (const row of grossRows) g[row.gross_id] = row.amount != null ? String(row.amount) : "";
      setGrossAmountEdits(g);

      const n: Record<number, string> = {};
      for (const row of netRows) n[row.net_id] = row.amount != null ? String(row.amount) : "";
      setNetAmountEdits(n);
    } catch (e: any) {
      setError(e.message ?? "Failed to load best ball");
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
          roster_id: form.roster_id ? Number(form.roster_id) : null,
          amount: form.amount ? Number(form.amount) : null,
          addedmoney: form.addedmoney ? Number(form.addedmoney) : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e: any) {
      setError(e.message ?? "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const deleteSubEvent = async () => {
    if (!id) return;
    if (!window.confirm("Delete this sub event?")) return;
    setBusy(true);
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
    if (!Number.isFinite(card1) || !Number.isFinite(card2)) return setError("Select both players");
    if (card1 === card2) return setError("Select two different players");
    setBusy(true);
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
      setBusy(false);
    }
  };

  const removePairing = async (bestballId: number) => {
    if (!id) return;
    if (!window.confirm("Delete this pairing?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}/bestball/pairings/${bestballId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await loadBestBall();
    } catch (e: any) {
      setError(e.message ?? "Failed to delete pairing");
    } finally {
      setBusy(false);
    }
  };

  const postBestBall = async () => {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}/bestball/post`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const postResult = await res.json().catch(() => null);
      await loadBestBall();

      const grossWinnerRows = Number(postResult?.diagnostics?.gross_winner_rows ?? 0);
      const netWinnerRows = Number(postResult?.diagnostics?.net_winner_rows ?? 0);
      const fallbackApplied = Boolean(postResult?.fallbackApplied);
      if (!fallbackApplied && grossWinnerRows + netWinnerRows === 0) {
        setError("Post Best Ball completed but returned no winners.");
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to post");
    } finally {
      setBusy(false);
    }
  };

  const unpostBestBall = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/subevents/${id}/bestball/unpost`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      await loadBestBall();
    } catch (e: any) {
      setError(e.message ?? "Failed to un-post");
    } finally {
      setBusy(false);
    }
  };

  const saveGrossAmount = async (grossId: number) => {
    if (!id) return;
    const raw = (grossAmountEdits[grossId] ?? "").trim();
    const amount = raw === "" ? null : Number(raw);
    if (raw !== "" && !Number.isFinite(amount)) return setError("Invalid gross amount");
    setBusy(true);
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
      setBusy(false);
    }
  };

  const saveNetAmount = async (netId: number) => {
    if (!id) return;
    const raw = (netAmountEdits[netId] ?? "").trim();
    const amount = raw === "" ? null : Number(raw);
    if (raw !== "" && !Number.isFinite(amount)) return setError("Invalid net amount");
    setBusy(true);
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
      setBusy(false);
    }
  };

  const cardOptionLabel = (card: PairingOption) => {
    const name = memberName(card.lastname, card.firstname);
    const date = formatCardDate(card.card_dt);
    const score = card.gross ?? "-";
    return name + " (" + date + " | " + String(score) + ")";
  };

  const flightComparisons = useMemo(() => {
    const flights = new Map<string, {
      flight_id: number | null;
      flightname: string | null;
      gross: GrossRow[];
      net: NetRow[];
    }>();

    for (const row of gross) {
      const key = String(row.flight_id ?? "na");
      const current =
        flights.get(key) ??
        { flight_id: row.flight_id ?? null, flightname: row.flightname ?? null, gross: [], net: [] };
      current.gross.push(row);
      flights.set(key, current);
    }

    for (const row of net) {
      const key = String(row.flight_id ?? "na");
      const current =
        flights.get(key) ??
        { flight_id: row.flight_id ?? null, flightname: row.flightname ?? null, gross: [], net: [] };
      current.net.push(row);
      flights.set(key, current);
    }

    return Array.from(flights.values())
      .sort((a, b) => {
        if (a.flight_id == null && b.flight_id != null) return 1;
        if (a.flight_id != null && b.flight_id == null) return -1;
        const nameA = (a.flightname ?? "").toLowerCase();
        const nameB = (b.flightname ?? "").toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return (a.flight_id ?? Number.MAX_SAFE_INTEGER) - (b.flight_id ?? Number.MAX_SAFE_INTEGER);
      })
      .map((flight) => {
        const nameOf = (row: {
          member1_lastname: string | null;
          member1_firstname: string | null;
          member2_lastname: string | null;
          member2_firstname: string | null;
        }) =>
          pairName(row.member1_lastname, row.member1_firstname, row.member2_lastname, row.member2_firstname).toLowerCase();

        const grossByBestBall = new Map<number, GrossRow>();
        for (const row of flight.gross) {
          if (typeof row.bestball_id === "number") grossByBestBall.set(row.bestball_id, row);
        }

        const sortedGross = [...flight.gross].sort((a, b) => {
          const aScore = typeof a.score === "number" ? a.score : Number.MAX_SAFE_INTEGER;
          const bScore = typeof b.score === "number" ? b.score : Number.MAX_SAFE_INTEGER;
          if (aScore !== bScore) return aScore - bScore;
          return nameOf(a).localeCompare(nameOf(b));
        });

        const sortedNet = [...flight.net].sort((a, b) => {
          const aGross = typeof a.bestball_id === "number" ? grossByBestBall.get(a.bestball_id) : undefined;
          const bGross = typeof b.bestball_id === "number" ? grossByBestBall.get(b.bestball_id) : undefined;
          const aScore = typeof aGross?.score === "number" ? aGross.score : Number.MAX_SAFE_INTEGER;
          const bScore = typeof bGross?.score === "number" ? bGross.score : Number.MAX_SAFE_INTEGER;
          if (aScore !== bScore) return aScore - bScore;
          return nameOf(a).localeCompare(nameOf(b));
        });

        const normalizedGross = sortedGross.map((r) => ({
          ...r,
          place: typeof r.place === "number" && r.place > 0 ? r.place : null,
          amount: hasWinningAmount(r.amount as any) ? Number(r.amount) : null,
        }));

        const normalizedNet = sortedNet.map((r) => ({
          ...r,
          place: typeof r.place === "number" && r.place > 0 ? r.place : null,
          amount: hasWinningAmount(r.amount as any) ? Number(r.amount) : null,
        }));

        const max = Math.max(normalizedGross.length, normalizedNet.length);
        const rows = Array.from({ length: max }, (_, i) => ({
          gross: normalizedGross[i] ?? null,
          net: normalizedNet[i] ?? null,
        }));

        return { ...flight, rows };
      });
  }, [gross, net]);

  const payoutFlightNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const f of flightComparisons) {
      if (typeof f.flight_id === "number" && f.flightname && f.flightname.trim()) {
        map.set(f.flight_id, f.flightname.trim());
      }
    }
    return map;
  }, [flightComparisons]);

  const groupedPayouts = useMemo(() => {
    const groups = new Map<string, PayoutRow[]>();
    for (const row of payouts) {
      const key = String(row.flight_id ?? "na");
      const arr = groups.get(key) ?? [];
      arr.push(row);
      groups.set(key, arr);
    }
    return Array.from(groups.entries()).map(([key, rows]) => ({
      flight_id: key === "na" ? null : Number(key),
      flightname: (rows.find((r) => (r.flightname ?? "").trim())?.flightname ?? null) as string | null,
      rows,
    }));
  }, [payouts]);

  return (
    <div className="page">
      <div className="eventHeader">
        <Link className="backLink" to={data?.event_id ? `/events/${data.event_id}` : "/events"}>← Back to Event</Link>
        <div className="eventTitle">{data?.eventname ?? "Event"}</div>
      </div>

      {loading ? <div className="muted">Loading...</div> : null}
      {error ? <div className="error">{error}</div> : null}

      {data ? (
        <>
          <div className="card">
            <div className="titleRow">
              <div className="title">{data.eventtypename ? `Sub Event - ${data.eventtypename}` : `Sub Event #${data.subevent_id}`}</div>
            </div>
            <div className="row"><div className="label">Type</div><select value={form.eventtype_id} onChange={(e) => setForm((p) => ({ ...p, eventtype_id: e.target.value }))}><option value="">Select type</option>{types.map((t) => <option key={t.eventtype_id} value={String(t.eventtype_id)}>{t.eventtypename ?? `Type ${t.eventtype_id}`}</option>)}</select></div>
            <div className="row"><div className="label">Roster</div><select value={form.roster_id} onChange={(e) => setForm((p) => ({ ...p, roster_id: e.target.value }))}><option value="">Select roster</option>{rosters.map((r) => <option key={r.roster_id} value={String(r.roster_id)}>{r.rostername ?? `Roster ${r.roster_id}`}</option>)}</select></div>
            <div className="row"><div className="label">Amount per Player</div><input value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} /></div>
            <div className="row"><div className="label">Added Money</div><input value={form.addedmoney} onChange={(e) => setForm((p) => ({ ...p, addedmoney: e.target.value }))} /></div>
            <div className="actionsRow">
              <div className="actionsLeft"><button className="btn" onClick={unpostBestBall} disabled={busy}>{busy ? "Working..." : "Un-Post Scores"}</button><button className="btn primary" onClick={postBestBall} disabled={busy}>{busy ? "Working..." : "Post Scores"}</button></div>
              <div className="actionsRight"><button className="btn primary" onClick={save} disabled={busy}>{busy ? "Saving..." : "Save"}</button><button className="btn danger" onClick={deleteSubEvent} disabled={busy}>Delete</button></div>
            </div>
          </div>

          {isBestBallType(data.eventtypename) ? (
            <>
              <div className="card wideCard">
                <div className="titleRow"><div className="title">Pairings</div></div>
                <div className="pairingRow">
                  <select value={pairingForm.card1_id} onChange={(e) => setPairingForm((p) => ({ ...p, card1_id: e.target.value }))}>
                    <option value="">Select player 1</option>
                    {cards.map((c) => <option key={`c1-${c.card_id}`} value={String(c.card_id)}>{cardOptionLabel(c)}</option>)}
                  </select>
                  <select value={pairingForm.card2_id} onChange={(e) => setPairingForm((p) => ({ ...p, card2_id: e.target.value }))}>
                    <option value="">Select player 2</option>
                    {cards.map((c) => <option key={`c2-${c.card_id}`} value={String(c.card_id)}>{cardOptionLabel(c)}</option>)}
                  </select>
                  <button className="btn primary" onClick={addPairing} disabled={busy || bestBallLoading}>Add Pairing</button>
                </div>
                {pairings.map((p) => (
                  <div key={p.bestball_id} className="pairingTableRow">
                    <span>{pairName(p.member1_lastname, p.member1_firstname, p.member2_lastname, p.member2_firstname)}</span>
                    <span>{p.gross ?? "-"}/{p.net ?? "-"}</span>
                    <span>{p.flightname ?? p.flight_id ?? "-"}</span>
                    <button className="btn danger" onClick={() => removePairing(p.bestball_id)} disabled={busy}>Remove</button>
                  </div>
                ))}
              </div>

              <div className="card wideCard">
                <div className="titleRow"><div className="title">Best Ball Payouts</div></div>
                {bestBallLoading ? <div className="muted">Loading payouts...</div> : null}

                {!bestBallLoading ? (
                  <div className="tablesWrap">
                    <div className="tableSection">
                      {flightComparisons.map((flight) => (
                        <div key={`flight-compare-${flight.flight_id ?? "na"}`} className="compareFlight">
                          <div className="compareFlightTitle">{flight.flightname ?? `Flight ${flight.flight_id ?? "Unassigned"}`}</div>
                          <div className="compareHead">
                            <div className="compareColHead"><span>Member</span><span>Gross</span><span>Place</span><span>Amount</span></div>
                            <div className="compareColHead"><span>Member</span><span>Net</span><span>Place</span><span>Amount</span></div>
                          </div>
                          {flight.rows.map((pair, idx) => (
                            <div key={`compare-row-${flight.flight_id ?? "na"}-${idx}`} className="compareRow compactRow">
                              <div className={`compareCol grossCol compactCol ${pair.gross && hasWinningAmount(pair.gross.amount as any) ? "winnerCol" : ""}`}>
                                {pair.gross ? (
                                  <>
                                    <div className="cellMember">{pairName(pair.gross.member1_lastname, pair.gross.member1_firstname, pair.gross.member2_lastname, pair.gross.member2_firstname)}</div>
                                    <div className="cellValue">{pair.gross.score ?? "-"}</div>
                                    <div className="cellValue">{pair.gross.place ?? "-"}</div>
                                    <div className="cellAmount">
                                      <input value={grossAmountEdits[pair.gross.gross_id] ?? ""} onChange={(e) => setGrossAmountEdits((prev) => ({ ...prev, [pair.gross!.gross_id]: e.target.value }))} />
                                      <button className="btn btn-sm" onClick={() => saveGrossAmount(pair.gross!.gross_id)} disabled={busy}>Save</button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="entryEmpty">-</div><div className="entryEmpty">-</div><div className="entryEmpty">-</div><div className="entryEmpty">-</div>
                                  </>
                                )}
                              </div>
                              <div className={`compareCol netCol compactCol ${pair.net && hasWinningAmount(pair.net.amount as any) ? "winnerCol" : ""}`}>
                                {pair.net ? (
                                  <>
                                    <div className="cellMember">{pairName(pair.net.member1_lastname, pair.net.member1_firstname, pair.net.member2_lastname, pair.net.member2_firstname)}</div>
                                    <div className="cellValue">{pair.net.score ?? "-"}</div>
                                    <div className="cellValue">{pair.net.place ?? "-"}</div>
                                    <div className="cellAmount">
                                      <input value={netAmountEdits[pair.net.net_id] ?? ""} onChange={(e) => setNetAmountEdits((prev) => ({ ...prev, [pair.net!.net_id]: e.target.value }))} />
                                      <button className="btn btn-sm" onClick={() => saveNetAmount(pair.net!.net_id)} disabled={busy}>Save</button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="entryEmpty">-</div><div className="entryEmpty">-</div><div className="entryEmpty">-</div><div className="entryEmpty">-</div>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                      {!flightComparisons.length ? <div className="muted">No best ball payout rows.</div> : null}
                    </div>

                    <div className="tableSection">
                      <div className="subTitle">Payout Table</div>
                      {groupedPayouts.map((group) => (
                        <div key={`payout-${group.flight_id ?? "na"}`} className="payoutGroup">
                          <div className="payoutGroupTitle">Flight: {group.flightname ?? (typeof group.flight_id === "number" ? (payoutFlightNameById.get(group.flight_id) ?? group.flight_id) : "Unassigned")}</div>
                          <div className="payoutRows">
                            {group.rows.map((row, idx) => (
                              <div key={`payout-${group.flight_id ?? "na"}-${idx}`} className="payoutRow">
                                <span>Place {row.place ?? "-"}</span>
                                <span>{row.amount != null ? Number(row.amount).toFixed(2) : "-"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {!payouts.length ? <div className="muted">No payout table rows.</div> : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </>
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
        .card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:14px; max-width: 520px; display:grid; gap:8px; }
        .wideCard { max-width: 100%; }
        .titleRow { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
        .title { font-size: 16px; font-weight: 700; color: #111827; }
        .subTitle { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 8px; }
        .row { display:grid; grid-template-columns: 120px 1fr; gap:10px; align-items:center; }
        .label { color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
        .actionsRow { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; justify-content: space-between; align-items: center; }
        .actionsLeft, .actionsRight { display: flex; gap: 8px; align-items: center; }
        .pairingRow { display:grid; grid-template-columns: 1fr 1fr auto; gap:8px; }
        .pairingTableRow { display:grid; grid-template-columns: 1.8fr .5fr .7fr auto; gap:8px; align-items:center; border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px; }
        .tablesWrap { display: grid; gap: 14px; }
        .tableSection { display: grid; gap: 6px; }
        .compareFlight { border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 10px; display: grid; gap: 4px; }
        .compareFlightTitle { font-size: 12px; font-weight: 800; color: #1f2937; }
        .compareHead { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        .compareColHead {
          display: grid;
          grid-template-columns: minmax(130px, 1fr) 56px 56px minmax(120px, 140px);
          gap: 8px;
          font-size: 10px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .compareRow { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border-bottom: 1px solid #eef2f7; padding: 4px 0; }
        .compareRow:last-child { border-bottom: 0; }
        .compareCol {
          display: grid;
          grid-template-columns: minmax(130px, 1fr) 56px 56px minmax(120px, 140px);
          gap: 8px;
          align-items: center;
          padding: 0;
          background: transparent;
          border: 0;
        }
        .winnerCol { background: #dbeafe; border-radius: 4px; }
        .compactCol { min-height: 24px; }
        .cellMember { font-size: 12px; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cellValue { font-size: 12px; color: #111827; text-align: left; }
        .cellAmount { display: inline-grid; grid-template-columns: 74px auto; gap: 6px; align-items: center; }
        .cellAmount input { padding: 3px 6px; font-size: 11px; }
        .btn.btn-sm { padding: 4px 8px; font-size: 11px; }
        .entryEmpty { font-size: 12px; color: #9ca3af; }
        .payoutGroup { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; }
        .payoutGroupTitle { font-size: 12px; font-weight: 700; color: #1f2937; margin-bottom: 4px; }
        .payoutRows { display: grid; gap: 4px; }
        .payoutRow { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #374151; }
        select,input { padding: 6px 8px; border-radius:8px; border:1px solid #d1d5db; min-width:0; font-size: 12px; }
        .btn { border:1px solid #d1d5db; background:#fff; border-radius:8px; padding:6px 10px; cursor:pointer; font-size: 12px; }
        .btn.primary { background:#2563eb; color:#fff; border-color:#2563eb; }
        .btn.danger { border-color:#ef4444; color:#ef4444; }
        .muted { color:#6b7280; font-size: 12px; }
        .error { color:#991b1b; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:8px; font-size: 12px; }
        @media (max-width: 900px) {
          .row{grid-template-columns:1fr;}
          .pairingRow{grid-template-columns:1fr;}
          .pairingTableRow{grid-template-columns:1fr;}
          .compareHead { display: none; }
          .compareRow { grid-template-columns: 1fr; }
          .compareCol { grid-template-columns: 1fr 56px 56px 1fr; gap: 6px; }
          .cellAmount { grid-template-columns: 1fr auto; }
          .cellMember { white-space: normal; }
        }
      `}</style>
    </div>
  );
}
