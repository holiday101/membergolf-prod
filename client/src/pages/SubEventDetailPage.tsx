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

type SkinRow = {
  eventskin_id: number;
  member_id: number;
  firstname: string | null;
  lastname: string | null;
  flight_id: number | null;
  flightname: string | null;
  hole: number | null;
  holenum: number | null;
  score: number | null;
  amount: number | null;
};

type SkinCardRow = {
  card_id: number;
  member_id: number;
  firstname: string | null;
  lastname: string | null;
  flight_id: number | null;
  flightname: string | null;
  card_dt: string | null;
  gross: number | null;
  net: number | null;
  handicap: number | null;
  nine_id: number | null;
  numholes: number | null;
  startinghole: number | null;
  hole1: number | null;
  hole2: number | null;
  hole3: number | null;
  hole4: number | null;
  hole5: number | null;
  hole6: number | null;
  hole7: number | null;
  hole8: number | null;
  hole9: number | null;
  par1: number | null;
  par2: number | null;
  par3: number | null;
  par4: number | null;
  par5: number | null;
  par6: number | null;
  par7: number | null;
  par8: number | null;
  par9: number | null;
};

function getHoleLabels(numholes: number | null, startinghole: number | null) {
  if (numholes === 9 && startinghole === 10) return [10, 11, 12, 13, 14, 15, 16, 17, 18];
  return [1, 2, 3, 4, 5, 6, 7, 8, 9];
}

function storageHoleNumber(displayHole: number, numholes: number | null, startinghole: number | null) {
  if (numholes === 9 && startinghole === 10) return displayHole - 9;
  return displayHole;
}

function getScoreMeta(score: number | null | undefined, par: number | null | undefined) {
  if (typeof score !== "number" || typeof par !== "number" || Number.isNaN(score) || Number.isNaN(par)) {
    return { className: "scoreCell", style: undefined };
  }
  const diff = score - par;
  if (diff === 0) return { className: "scoreCell neutral", style: undefined };
  if (diff === -1) return { className: "scoreCell birdie", style: undefined };
  if (diff <= -2) return { className: "scoreCell eagle", style: undefined };
  if (diff >= 1) {
    const bg = diff >= 4 ? "#1d4ed8" : diff === 3 ? "#3b82f6" : diff === 2 ? "#60a5fa" : "#93c5fd";
    const color = diff >= 3 ? "#eff6ff" : "#0f172a";
    return { className: "scoreCell over", style: { background: bg, color } };
  }
  return { className: "scoreCell", style: undefined };
}

function getCardScore(row: SkinCardRow, displayHole: number) {
  const storage = storageHoleNumber(displayHole, row.numholes, row.startinghole);
  return (row as any)[`hole${storage}`] as number | null | undefined;
}

function getCardPar(row: SkinCardRow, displayHole: number) {
  const storage = storageHoleNumber(displayHole, row.numholes, row.startinghole);
  return (row as any)[`par${storage}`] as number | null | undefined;
}

export default function SubEventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<SubEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [skinsBusy, setSkinsBusy] = useState(false);
  const [skins, setSkins] = useState<SkinRow[]>([]);
  const [skinCards, setSkinCards] = useState<SkinCardRow[]>([]);
  const [skinsLoading, setSkinsLoading] = useState(false);
  const [amountEdits, setAmountEdits] = useState<Record<number, string>>({});
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

  const isSkinsType = (data?.eventtypename ?? "").toLowerCase().includes("skin");

  const loadSkins = async () => {
    if (!id) return;
    setSkinsLoading(true);
    try {
      const [res, cardsRes] = await Promise.all([
        apiFetch(`/subevents/${id}/skins`),
        apiFetch(`/subevents/${id}/skins/cards`),
      ]);
      if (!res.ok) throw new Error(await res.text());
      if (!cardsRes.ok) throw new Error(await cardsRes.text());
      const rows = (await res.json()) as SkinRow[];
      const cardRows = (await cardsRes.json()) as SkinCardRow[];
      setSkins(rows);
      setSkinCards(cardRows);
      const edits: Record<number, string> = {};
      for (const row of rows) edits[row.eventskin_id] = row.amount != null ? String(row.amount) : "";
      setAmountEdits(edits);
    } catch (e: any) {
      setError(e.message ?? "Failed to load skins");
      setSkins([]);
      setSkinCards([]);
      setAmountEdits({});
    } finally {
      setSkinsLoading(false);
    }
  };

  useEffect(() => {
    if (isSkinsType) loadSkins();
  }, [id, isSkinsType]);

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

  const postSkins = async () => {
    if (!id) return;
    setSkinsBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}/skins/post`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      await loadSkins();
    } catch (e: any) {
      setError(e.message ?? "Failed to post skins");
    } finally {
      setSkinsBusy(false);
    }
  };

  const unpostSkins = async () => {
    if (!id) return;
    setSkinsBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}/skins/unpost`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      await loadSkins();
    } catch (e: any) {
      setError(e.message ?? "Failed to un-post skins");
    } finally {
      setSkinsBusy(false);
    }
  };

  const skinCardFlights = useMemo(() => {
    const groups = new Map<string, SkinCardRow[]>();
    for (const row of skinCards) {
      const key = String(row.flight_id ?? "na") + "::" + String(row.flightname ?? "Unassigned");
      const arr = groups.get(key) ?? [];
      arr.push(row);
      groups.set(key, arr);
    }
    return Array.from(groups.entries()).map(([key, rows]) => {
      const parts = key.split("::");
      return {
        flight_id: parts[0] === "na" ? null : Number(parts[0]),
        flightname: parts.slice(1).join("::") || null,
        rows,
      };
    });
  }, [skinCards]);

  const updateSkinAmount = async (skinId: number) => {
    if (!id) return;
    const raw = (amountEdits[skinId] ?? "").trim();
    const amount = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(amount)) {
      setError("Invalid amount");
      return;
    }
    setSkinsBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/subevents/${id}/skins/${skinId}`, {
        method: "PATCH",
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadSkins();
    } catch (e: any) {
      setError(e.message ?? "Failed to update amount");
    } finally {
      setSkinsBusy(false);
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
          {isSkinsType ? (
            <div className="skinsCardsWrap">
              <div className="card wideCard">
                <div className="titleRow">
                <div className="title">Skins</div>
                <div className="actionsRight">
                  <button className="btn" onClick={unpostSkins} disabled={skinsBusy}>
                    {skinsBusy ? "Working…" : "Un-Post Scores"}
                  </button>
                  <button className="btn primary" onClick={postSkins} disabled={skinsBusy}>
                    {skinsBusy ? "Working…" : "Post Skins"}
                  </button>
                </div>
              </div>
              {skinsLoading ? <div className="muted">Loading skins…</div> : null}
              {!skinsLoading ? (
                <div className="skinsTable">
                  <div className="skinsHead">
                    <span>Flight</span>
                    <span>Member</span>
                    <span>Hole</span>
                    <span>Score</span>
                    <span>Amount</span>
                    <span></span>
                  </div>
                  {skins.map((s) => (
                    <div key={s.eventskin_id} className="skinsRow">
                      <span>{s.flightname ?? s.flight_id ?? "—"}</span>
                      <span>{(s.lastname || "").trim()}, {(s.firstname || "").trim()}</span>
                      <span>{s.holenum ?? s.hole ?? "—"}</span>
                      <span>{s.score ?? "—"}</span>
                      <input
                        value={amountEdits[s.eventskin_id] ?? ""}
                        onChange={(e) =>
                          setAmountEdits((prev) => ({ ...prev, [s.eventskin_id]: e.target.value }))
                        }
                      />
                      <button
                        className="btn"
                        onClick={() => updateSkinAmount(s.eventskin_id)}
                        disabled={skinsBusy}
                      >
                        Save
                      </button>
                    </div>
                  ))}
                  {!skins.length ? <div className="muted">No skins posted yet.</div> : null}
                </div>
              ) : null}
              </div>
              {!skinsLoading && skins.length > 0 ? (
                <div className="card wideCard">
                  <div className="title">Skins Card Details</div>
                  <div className="skinsDetails">
                    <div className="detailsList">
                      {skinCardFlights.map((flight) => {
                      const headerLabels = getHoleLabels(flight.rows[0]?.numholes ?? 9, flight.rows[0]?.startinghole ?? 1);
                      return (
                        <div key={`flight-${flight.flight_id ?? "na"}-${flight.flightname ?? ""}`} className="flightSection">
                          <div className="flightHeader">{flight.flightname ?? flight.flight_id ?? "Unassigned"}</div>
                          <div className="detailHeadRow">
                            <span>Name</span>
                            <span>Card Date</span>
                            <span>Hdcp</span>
                            <div className="holesHeadGrid">
                              {headerLabels.map((h) => (
                                <span key={`head-${flight.flight_id ?? "na"}-${h}`}>{h}</span>
                              ))}
                            </div>
                            <span>Gross</span>
                            <span>Net</span>
                          </div>
                          {flight.rows.map((row) => {
                            const labels = getHoleLabels(row.numholes, row.startinghole);
                            return (
                              <div key={row.card_id} className="detailRow">
                                <div className="detailMeta">
                                  <span className="memberTag">{(row.lastname || "").trim()}, {(row.firstname || "").trim()}</span>
                                </div>
                                <div className="dateCell">{row.card_dt ? new Date(row.card_dt).toLocaleDateString() : "—"}</div>
                                <div className="statCell">{row.handicap ?? "—"}</div>
                                <div className="scoreGrid">
                                  {labels.map((h) => {
                                    const score = getCardScore(row, h);
                                    const par = getCardPar(row, h);
                                    const meta = getScoreMeta(score, par);
                                    return (
                                      <div key={`${row.card_id}-${h}`} className={meta.className} style={meta.style}>
                                        {typeof score === "number" ? score : "—"}
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="statCell">{row.gross ?? "—"}</div>
                                <div className="statCell">{row.net ?? "—"}</div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                      {!skinCards.length ? <div className="muted">No card details available.</div> : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
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
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; max-width: 520px; }
        .wideCard { max-width: 100%; }
        .skinsCardsWrap { display: grid; gap: 12px; }
        .titleRow { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
        .title { font-size: 16px; font-weight: 700; color: #111827; }
        .row { display: grid; grid-template-columns: 152px 1fr; gap: 10px; padding: 4px 0; align-items: center; }
        .label { color: #64748b; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; background: transparent; border: 0; border-radius: 0; padding: 0; line-height: 1.2; white-space: nowrap; }
        .value { color: #1f2937; font-size: 13px; font-weight: 600; }
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
        .skinsTable { display: grid; gap: 8px; margin-top: 8px; }
        .skinsHead, .skinsRow {
          display: grid;
          grid-template-columns: 1fr 2fr 70px 70px 110px 80px;
          gap: 8px;
          align-items: center;
        }
        .skinsHead { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; }
        .skinsRow {
          font-size: 12px;
          color: #374151;
          border-top: 1px solid #f3f4f6;
          padding-top: 6px;
        }
        .skinsDetails { margin-top: 8px; display: grid; gap: 8px; }
        .detailsTitle { font-size: 13px; font-weight: 700; color: #111827; }
        .detailsHint { font-size: 11px; color: #6b7280; }
        .detailsList { display: grid; gap: 8px; }
        .flightSection { display: grid; gap: 2px; }
        .flightHeader { font-size: 12px; font-weight: 800; color: #1e3a8a; padding: 2px 0 4px; border-bottom: 1px solid #dbeafe; }
        .detailHeadRow { display: grid; grid-template-columns: minmax(220px, 320px) minmax(92px, 110px) 60px 1fr 60px 60px; gap: 8px; align-items: center; color: #6b7280; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 0; }
        .holesHeadGrid { display: grid; grid-template-columns: repeat(9, minmax(26px, 1fr)); gap: 4px; text-align: center; }
        .detailRow { display: grid; grid-template-columns: minmax(220px, 320px) minmax(92px, 110px) 60px 1fr 60px 60px; gap: 8px; align-items: center; padding: 4px 0; border-bottom: 1px solid #e5e7eb; }
        .detailMeta { display: flex; gap: 8px; align-items: center; min-width: 0; font-size: 11px; }
        .dateCell { color: #6b7280; font-size: 11px; white-space: nowrap; text-align: left; }
                .memberTag { color: #1f2937; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .scoreGrid { display: grid; grid-template-columns: repeat(9, minmax(28px, 1fr)); gap: 2px; align-items: stretch; }
                .scoreCell { border: 1px solid #e5e7eb; border-radius: 3px; padding: 2px 0; font-size: 11px; color: #111827; background: #fff; font-weight: 600; text-align: center; display: grid; place-items: center; line-height: 1; }
        .scoreCell.neutral { background: #f8fafc; }
        .scoreCell.birdie { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
        .scoreCell.eagle { background: #fecaca; color: #7f1d1d; border-color: #fca5a5; font-weight: 700; }
        .statCell { text-align: center; font-size: 11px; color: #374151; font-weight: 600; }
        .muted { color: #6b7280; font-size: 12px; }
        .error { color: #a00; font-size: 12px; }
        @media (max-width: 760px) {
          .skinsHead { display: none; }
          .skinsRow { grid-template-columns: 1fr; gap: 6px; }
          .detailHeadRow { display: none; }
          .detailRow { grid-template-columns: 1fr; align-items: start; }
          .dateCell { text-align: left; }
          .detailMeta { flex-wrap: wrap; }
          .scoreGrid { grid-template-columns: repeat(9, minmax(24px, 1fr)); }
        }
      `}</style>
    </div>
  );
}
