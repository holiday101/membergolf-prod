import { useEffect, useMemo, useRef, useState } from "react";
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
  autoflight_yn?: number | null;
};

type GrossRow = {
  gross_id: number;
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

type NetRow = {
  net_id: number;
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
  flightname?: string | null;
};

type Me = {
  user?: {
    isAdmin?: boolean;
    globalYn?: number | null;
  };
};

function isStrokeType(name: string | null | undefined) {
  return (name ?? "").toLowerCase().includes("stroke");
}

function hasWinningAmount(amount: number | string | null | undefined) {
  const n = typeof amount === "number" ? amount : Number(amount ?? 0);
  return Number.isFinite(n) && n > 0;
}

export default function SubEventStrokePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<SubEventDetail | null>(null);
  const [types, setTypes] = useState<Array<{ eventtype_id: number; eventtypename: string | null }>>([]);
  const [rosters, setRosters] = useState<Array<{ roster_id: number; rostername: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [strokeLoading, setStrokeLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [strokeBusy, setStrokeBusy] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [autoFlightBusy, setAutoFlightBusy] = useState(false);
  const [autoFlightDone, setAutoFlightDone] = useState(false);
  const autoFlightResetTimerRef = useRef<number | null>(null);
  const [gross, setGross] = useState<GrossRow[]>([]);
  const [net, setNet] = useState<NetRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [grossAmountEdits, setGrossAmountEdits] = useState<Record<number, string>>({});
  const [netAmountEdits, setNetAmountEdits] = useState<Record<number, string>>({});
  const [form, setForm] = useState({
    eventtype_id: "",
    eventnumhole_id: "",
    roster_id: "",
    amount: "",
    addedmoney: "",
  });

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
        const nameOf = (last: string | null | undefined, first: string | null | undefined) =>
          (last ?? "").trim().toLowerCase() + "|" + (first ?? "").trim().toLowerCase();

        const grossByCard = new Map<number, GrossRow>();
        const grossByMember = new Map<number, GrossRow>();
        for (const row of flight.gross) {
          if (typeof row.card_id === "number") grossByCard.set(row.card_id, row);
          if (typeof row.member_id === "number" && !grossByMember.has(row.member_id)) grossByMember.set(row.member_id, row);
        }

        const compareByGrossNameCard = (
          aGrossScore: number | null | undefined,
          aLast: string | null | undefined,
          aFirst: string | null | undefined,
          aCard: number | null | undefined,
          bGrossScore: number | null | undefined,
          bLast: string | null | undefined,
          bFirst: string | null | undefined,
          bCard: number | null | undefined
        ) => {
          const aScore = typeof aGrossScore === "number" ? aGrossScore : Number.MAX_SAFE_INTEGER;
          const bScore = typeof bGrossScore === "number" ? bGrossScore : Number.MAX_SAFE_INTEGER;
          if (aScore !== bScore) return aScore - bScore;

          const aName = nameOf(aLast, aFirst);
          const bName = nameOf(bLast, bFirst);
          if (aName !== bName) return aName.localeCompare(bName);

          const aCardId = typeof aCard === "number" ? aCard : Number.MAX_SAFE_INTEGER;
          const bCardId = typeof bCard === "number" ? bCard : Number.MAX_SAFE_INTEGER;
          return aCardId - bCardId;
        };

        const sortedGross = [...flight.gross].sort((a, b) =>
          compareByGrossNameCard(
            a.score,
            a.lastname,
            a.firstname,
            a.card_id,
            b.score,
            b.lastname,
            b.firstname,
            b.card_id
          )
        );

        const sortedNet = [...flight.net].sort((a, b) => {
          const aGross =
            (typeof a.card_id === "number" ? grossByCard.get(a.card_id) : undefined) ??
            (typeof a.member_id === "number" ? grossByMember.get(a.member_id) : undefined);
          const bGross =
            (typeof b.card_id === "number" ? grossByCard.get(b.card_id) : undefined) ??
            (typeof b.member_id === "number" ? grossByMember.get(b.member_id) : undefined);

          return compareByGrossNameCard(
            aGross?.score,
            a.lastname,
            a.firstname,
            a.card_id,
            bGross?.score,
            b.lastname,
            b.firstname,
            b.card_id
          );
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

  const loadStroke = async () => {
    if (!id) return;
    setStrokeLoading(true);
    try {
      const res = await apiFetch(`/subevents/${id}/stroke`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const grossRows = (json.gross ?? []) as GrossRow[];
      const netRows = (json.net ?? []) as NetRow[];
      setGross(grossRows);
      setNet(netRows);
      setPayouts((json.payouts ?? []) as PayoutRow[]);

      const grossEdits: Record<number, string> = {};
      for (const row of grossRows) {
        grossEdits[row.gross_id] = row.amount != null ? String(row.amount) : "";
      }
      setGrossAmountEdits(grossEdits);

      const netEdits: Record<number, string> = {};
      for (const row of netRows) {
        netEdits[row.net_id] = row.amount != null ? String(row.amount) : "";
      }
      setNetAmountEdits(netEdits);
    } catch (e: any) {
      setError(e.message ?? "Failed to load stroke payouts");
      setGross([]);
      setNet([]);
      setPayouts([]);
      setGrossAmountEdits({});
      setNetAmountEdits({});
    } finally {
      setStrokeLoading(false);
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
    if (!data || !isStrokeType(data.eventtypename)) return;
    loadStroke();
  }, [id, data?.eventtypename]);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const res = await apiFetch("/me");
        if (!res.ok) return;
        const json = (await res.json()) as Me;
        setMe(json);
      } catch {
        // No-op: this page should remain usable even if /me fails.
      }
    };
    loadMe();
  }, []);

  useEffect(() => {
    return () => {
      if (autoFlightResetTimerRef.current != null) {
        window.clearTimeout(autoFlightResetTimerRef.current);
      }
    };
  }, []);

  const isAdmin = Boolean(me?.user?.isAdmin || me?.user?.globalYn === 1);
  const autoFlightEnabledForCourse = (data?.autoflight_yn ?? 1) === 1;

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

  const postStroke = async () => {
    if (!id) return;
    setStrokeBusy(true);
    setError("");
    try {
      // Ensure calculation uses the latest on-screen subevent values.
      const saveRes = await apiFetch(`/subevents/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          eventtype_id: form.eventtype_id ? Number(form.eventtype_id) : null,
          eventnumhole_id: form.eventnumhole_id ? Number(form.eventnumhole_id) : null,
          roster_id: form.roster_id ? Number(form.roster_id) : null,
          amount: form.amount ? Number(form.amount) : null,
          addedmoney: form.addedmoney ? Number(form.addedmoney) : null,
        }),
      });
      if (!saveRes.ok) throw new Error(await saveRes.text());

      const res = await apiFetch(`/subevents/${id}/stroke/post`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const postResult = await res.json().catch(() => null);
      await loadStroke();

      const grossWinnerRows = Number(postResult?.diagnostics?.gross_winner_rows ?? 0);
      const netWinnerRows = Number(postResult?.diagnostics?.net_winner_rows ?? 0);
      const fallbackApplied = Boolean(postResult?.fallbackApplied);
      if (!fallbackApplied && grossWinnerRows + netWinnerRows === 0) {
        setError("Post Scores completed but returned no winners.");
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to post stroke payouts");
    } finally {
      setStrokeBusy(false);
    }
  };

  const unpostStroke = async () => {
    if (!id) return;
    setStrokeBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}/stroke/unpost`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      await loadStroke();
    } catch (e: any) {
      setError(e.message ?? "Failed to un-post stroke payouts");
    } finally {
      setStrokeBusy(false);
    }
  };

  const autoFlight = async () => {
    if (!id || !isAdmin) return;
    if (!autoFlightEnabledForCourse) {
      setError("Auto Flight is disabled for this course.");
      return;
    }
    if (!form.roster_id) {
      setError("Please select a roster before Auto Flight.");
      return;
    }
    if (!window.confirm("Are you sure you want to Auto Flight?")) return;

    setAutoFlightBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}/stroke/autoflight`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      await loadStroke();
      setAutoFlightDone(true);
      if (autoFlightResetTimerRef.current != null) {
        window.clearTimeout(autoFlightResetTimerRef.current);
      }
      autoFlightResetTimerRef.current = window.setTimeout(() => {
        setAutoFlightDone(false);
      }, 3000);
    } catch (e: any) {
      setError(e.message ?? "Failed to auto flight");
    } finally {
      setAutoFlightBusy(false);
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
    setStrokeBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}/stroke/gross/${grossId}`, {
        method: "PATCH",
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadStroke();
    } catch (e: any) {
      setError(e.message ?? "Failed to save gross amount");
    } finally {
      setStrokeBusy(false);
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
    setStrokeBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}/stroke/net/${netId}`, {
        method: "PATCH",
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadStroke();
    } catch (e: any) {
      setError(e.message ?? "Failed to save net amount");
    } finally {
      setStrokeBusy(false);
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
              <div className="rowControl">
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
                {isAdmin && autoFlightEnabledForCourse ? (
                  <button
                    className={`btn ${autoFlightDone ? "success" : ""}`.trim()}
                    onClick={autoFlight}
                    disabled={autoFlightBusy || !form.roster_id}
                  >
                    {autoFlightBusy ? "Working…" : autoFlightDone ? "Auto Flighted" : "Auto Flight"}
                  </button>
                ) : null}
              </div>
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
                <button className="btn" onClick={unpostStroke} disabled={strokeBusy}>
                  {strokeBusy ? "Working…" : "Un-Post Scores"}
                </button>
                <button className="btn primary" onClick={postStroke} disabled={strokeBusy}>
                  {strokeBusy ? "Working…" : "Post Scores"}
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

          {isStrokeType(data.eventtypename) ? (
            <div className="card wideCard">
              <div className="titleRow">
                <div className="title">Stroke Play Payouts</div>
              </div>

              {strokeLoading ? <div className="muted">Loading payouts…</div> : null}

              {!strokeLoading ? (
                <div className="tablesWrap">
                  <div className="tableSection">
                    
                    {flightComparisons.map((flight) => (
                      <div key={`flight-compare-${flight.flight_id ?? "na"}`} className="compareFlight">
                        <div className="compareFlightTitle">{flight.flightname ?? `Flight ${flight.flight_id ?? "Unassigned"}`}</div>
                        <div className="compareHead">
                          <div className="compareColHead">
                            <span>Member</span>
                            <span>Gross</span>
                            <span>Place</span>
                            <span>Amount</span>
                          </div>
                          <div className="compareColHead">
                            <span>Member</span>
                            <span>Net</span>
                            <span>Place</span>
                            <span>Amount</span>
                          </div>
                        </div>
                        {flight.rows.map((pair, idx) => (
                          <div key={`compare-row-${flight.flight_id ?? "na"}-${idx}`} className="compareRow compactRow">
                            <div className={`compareCol grossCol compactCol ${pair.gross && hasWinningAmount(pair.gross.amount as any) ? "winnerCol" : ""}`}>
                              {pair.gross ? (
                                <>
                                  <div className="cellMember">{(pair.gross.lastname || "").trim()}, {(pair.gross.firstname || "").trim()}</div>
                                  <div className="cellValue">{pair.gross.score ?? "—"}</div>
                                  <div className="cellValue">{pair.gross.place ?? "—"}</div>
                                  <div className="cellAmount">
                                    <input
                                      value={grossAmountEdits[pair.gross.gross_id] ?? ""}
                                      onChange={(e) =>
                                        setGrossAmountEdits((prev) => ({ ...prev, [pair.gross!.gross_id]: e.target.value }))
                                      }
                                    />
                                    <button className="btn btn-sm" onClick={() => saveGrossAmount(pair.gross!.gross_id)} disabled={strokeBusy}>
                                      Save
                                    </button>
                                    
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="entryEmpty">—</div>
                                  <div className="entryEmpty">—</div>
                                  <div className="entryEmpty">—</div>
                                  <div className="entryEmpty">—</div>
                                </>
                              )}
                            </div>
                            <div className={`compareCol netCol compactCol ${pair.net && hasWinningAmount(pair.net.amount as any) ? "winnerCol" : ""}`}>
                              {pair.net ? (
                                <>
                                  <div className="cellMember">{(pair.net.lastname || "").trim()}, {(pair.net.firstname || "").trim()}</div>
                                  <div className="cellValue">{pair.net.score ?? "—"}</div>
                                  <div className="cellValue">{pair.net.place ?? "—"}</div>
                                  <div className="cellAmount">
                                    <input
                                      value={netAmountEdits[pair.net.net_id] ?? ""}
                                      onChange={(e) =>
                                        setNetAmountEdits((prev) => ({ ...prev, [pair.net!.net_id]: e.target.value }))
                                      }
                                    />
                                    <button className="btn btn-sm" onClick={() => saveNetAmount(pair.net!.net_id)} disabled={strokeBusy}>
                                      Save
                                    </button>
                                    
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="entryEmpty">—</div>
                                  <div className="entryEmpty">—</div>
                                  <div className="entryEmpty">—</div>
                                  <div className="entryEmpty">—</div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                    {!flightComparisons.length ? <div className="muted">No stroke payout rows.</div> : null}
                  </div>

                  <div className="tableSection">
                    <div className="subTitle">Payout Table</div>
                    {groupedPayouts.map((group) => (
                      <div key={`payout-${group.flight_id ?? "na"}`} className="payoutGroup">
                        <div className="payoutGroupTitle">Flight: {group.flightname ?? (typeof group.flight_id === "number" ? (payoutFlightNameById.get(group.flight_id) ?? group.flight_id) : "Unassigned")}</div>
                        <div className="payoutRows">
                          {group.rows.map((row, idx) => (
                            <div key={`payout-${group.flight_id ?? "na"}-${idx}`} className="payoutRow">
                              <span>Place {row.place ?? "—"}</span>
                              <span>{row.amount != null ? Number(row.amount).toFixed(2) : "—"}</span>
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
          ) : (
            <div className="muted">This sub event is not a Stroke Play type.</div>
          )}
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
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; max-width: 520px; }
        .wideCard { max-width: 100%; }
        .titleRow { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
        .title { font-size: 16px; font-weight: 700; color: #111827; }
        .subTitle { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 8px; }
        .row { display: grid; grid-template-columns: 120px 1fr; gap: 10px; padding: 4px 0; align-items: center; }
        .rowControl { display: flex; gap: 8px; align-items: center; }
        .rowControl select { flex: 1; }
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
        .btn.success { background: #16a34a; color: #fff; border-color: #16a34a; }
        .btn.danger { background: #fff; color: #374151; border-color: #d1d5db; }
        .actionsRow { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; justify-content: space-between; align-items: center; }
        .actionsLeft, .actionsRight { display: flex; gap: 8px; align-items: center; }
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
        .winnerCol {
          background: #dbeafe;
          border-radius: 4px;
        }
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
        .muted { color: #6b7280; font-size: 12px; }
        .error { color: #a00; font-size: 12px; }
        @media (max-width: 760px) {
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
