import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { publicFetch } from "../api/public";

type EventRow = {
  id: number;
  eventname: string;
  eventdescription: string | null;
  start_dt: string;
  end_dt: string;
  ninename?: string | null;
  numholes?: number | null;
  startinghole?: number | null;
};

type WinningsRow = {
  moneylist_id: number;
  member_id: number;
  firstname: string | null;
  lastname: string | null;
  amount: number;
  flight_id: number | null;
  flight_name: string | null;
  place: number | null;
  description: string | null;
  payout_type: string | null;
  score: number | null;
  card_id: number | null;
};

type EventFile = {
  eventfile_id: number;
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
  url: string;
};

type ScoreCard = {
  card_id: number;
  member_id: number;
  firstname: string | null;
  lastname: string | null;
  gross: number | null;
  net: number | null;
  adjustedscore: number | null;
  numholes: number | null;
  startinghole: number | null;
  [key: string]: any; // hole1-hole18, par1-par18
};

type FlightGroup = {
  flightKey: string;
  flightLabel: string;
  gross: WinningsRow[];
  net: WinningsRow[];
  skinGroups: { type: string; label: string; rows: WinningsRow[] }[];
  other: { type: string; label: string; rows: WinningsRow[] }[];
};

function payoutLabel(value: string | null) {
  switch ((value || "").toUpperCase()) {
    case "BB_GROSS":
      return "Best Ball Gross";
    case "BB_NET":
      return "Best Ball Net";
    case "GROSS":
      return "Gross";
    case "NET":
      return "Net";
    case "SKINS":
      return "Skins";
    case "SKIN":
      return "Skin";
    case "POWER_SKIN":
      return "Power Skin";
    case "CHICAGO":
      return "Chicago";
    case "OTHER":
      return "Other";
    default:
      return value || "Other";
  }
}

function mapBackNineSkinDescription(description: string | null, payoutType: string | null, isBackNine: boolean) {
  if (!description) return "";
  if (!isBackNine) return description;
  const type = (payoutType || "").toUpperCase();
  if (type !== "SKINS" && type !== "SKIN" && type !== "POWER_SKIN" && !/hole\s*\d+/i.test(description)) return description;
  return description.replace(/(\bHole\s*)([1-9])\b/gi, function (_m, p1, p2) {
    return p1 + String(Number(p2) + 9);
  });
}

function cleanText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/open\s+play\s+back\s*nine/gi, "")
    .replace(/open\s+play\s+back\s*9/gi, "")
    .replace(/back\s*nine/gi, "")
    .replace(/back\s*9/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+[\-|\u2022]+\s*$/g, "")
    .trim();
}

const SKIN_TYPES = new Set(["SKINS", "SKIN", "POWER_SKIN"]);
const STROKE_TYPES = new Set(["GROSS", "NET"]);

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount ?? 0);
}

function getScoreMeta(score: number | null | undefined, par: number | null | undefined) {
  if (typeof score !== "number" || typeof par !== "number" || Number.isNaN(score) || Number.isNaN(par)) {
    return { className: "holeCell", style: undefined, showEagle: false };
  }
  const diff = score - par;
  if (diff === 0) return { className: "holeCell neutral", style: undefined, showEagle: false };
  if (diff === -1) return { className: "holeCell birdie", style: undefined, showEagle: false };
  if (diff <= -2) return { className: "holeCell eagle", style: undefined, showEagle: true };
  if (diff >= 1) {
    const bg = diff >= 4 ? "#1d4ed8" : diff === 3 ? "#3b82f6" : diff === 2 ? "#60a5fa" : "#93c5fd";
    const color = diff >= 3 ? "#eff6ff" : "#0f172a";
    return { className: "holeCell over", style: { background: bg, color }, showEagle: false };
  }
  return { className: "holeCell", style: undefined, showEagle: false };
}

export default function PublicEventDetailPage() {
  const { courseId, eventId } = useParams();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [files, setFiles] = useState<EventFile[]>([]);
  const [winnings, setWinnings] = useState<WinningsRow[]>([]);
  const [scoresCount, setScoresCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Scorecard expansion
  const [allScores, setAllScores] = useState<ScoreCard[] | null>(null);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  const [expandedName, setExpandedName] = useState<string>("");
  const [popoverAnchor, setPopoverAnchor] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!courseId || !eventId) return;
      setLoading(true);
      setError("");
      try {
        const [eventRes, filesRes, winningsRes, scoresRes] = await Promise.all([
          publicFetch<EventRow>(`/public/${courseId}/events/${eventId}`),
          publicFetch<EventFile[]>(`/public/${courseId}/events/${eventId}/files`),
          publicFetch<WinningsRow[]>(`/public/${courseId}/events/${eventId}/winnings`),
          publicFetch<{ count: number }>(`/public/${courseId}/events/${eventId}/scores/exists`),
        ]);
        setEvent(eventRes);
        setFiles(filesRes);
        setWinnings(winningsRes);
        setScoresCount(scoresRes?.count ?? 0);
      } catch (e: any) {
        setError(e.message ?? "Failed to load event");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [courseId, eventId]);

  const isBackNineEvent = (event?.numholes ?? null) === 9 && (event?.startinghole ?? null) === 10
    || (event?.ninename || "").toLowerCase().includes("back");

  // Fetch all scores on first click, then cache
  const handlePlayerClick = useCallback(async (row: WinningsRow, e: React.MouseEvent) => {
    const cardId = row.card_id;
    if (!cardId) return;
    if (expandedCardId === cardId) {
      setExpandedCardId(null);
      setPopoverAnchor(null);
      return;
    }
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    setPopoverAnchor({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 420) });
    setExpandedName(`${(row.firstname || "").trim()} ${(row.lastname || "").trim()}`);

    if (!allScores && !scoresLoading) {
      setScoresLoading(true);
      try {
        const scores = await publicFetch<ScoreCard[]>(`/public/${courseId}/events/${eventId}/scores`);
        setAllScores(scores);
      } catch {
        setAllScores([]);
      } finally {
        setScoresLoading(false);
      }
    }
    setExpandedCardId(cardId);
  }, [expandedCardId, allScores, scoresLoading, courseId, eventId]);

  // Group all winnings by flight, then by payout type within each flight
  const flightGroups = useMemo(() => {
    const map = new Map<string, FlightGroup>();
    const noFlightOther: WinningsRow[] = [];

    for (const row of winnings) {
      const type = (row.payout_type || "OTHER").toUpperCase();
      const flightLabel = row.flight_name
        ? `${row.flight_name.trim()} Flight`
        : row.flight_id
          ? `Flight ${row.flight_id}`
          : null;

      if (!flightLabel && !STROKE_TYPES.has(type) && !SKIN_TYPES.has(type)) {
        noFlightOther.push(row);
        continue;
      }

      const key = `${row.flight_id ?? "na"}::${flightLabel || "Overall"}`;
      if (!map.has(key)) {
        map.set(key, {
          flightKey: key,
          flightLabel: flightLabel || "Overall",
          gross: [],
          net: [],
          skinGroups: [],
          other: [],
        });
      }
      const group = map.get(key)!;

      if (type === "GROSS") {
        group.gross.push(row);
      } else if (type === "NET") {
        group.net.push(row);
      } else if (SKIN_TYPES.has(type)) {
        let skinGroup = group.skinGroups.find((sg) => sg.type === type);
        if (!skinGroup) {
          skinGroup = { type, label: payoutLabel(type), rows: [] };
          group.skinGroups.push(skinGroup);
        }
        skinGroup.rows.push(row);
      } else {
        let otherGroup = group.other.find((og) => og.type === type);
        if (!otherGroup) {
          otherGroup = { type, label: payoutLabel(type), rows: [] };
          group.other.push(otherGroup);
        }
        otherGroup.rows.push(row);
      }
    }

    const byName = (a: WinningsRow, b: WinningsRow) =>
      `${a.lastname ?? ""}, ${a.firstname ?? ""}`.localeCompare(`${b.lastname ?? ""}, ${b.firstname ?? ""}`, undefined, { sensitivity: "base" });

    const result = Array.from(map.values()).map((fg) => ({
      ...fg,
      gross: [...fg.gross].sort(byName),
      net: [...fg.net].sort(byName),
      skinGroups: fg.skinGroups.map((sg) => ({
        ...sg,
        rows: [...sg.rows].sort((a, b) => {
          const ah = Number((a.description || "").replace(/\D/g, "")) || 999;
          const bh = Number((b.description || "").replace(/\D/g, "")) || 999;
          if (ah !== bh) return ah - bh;
          return byName(a, b);
        }),
      })),
      other: fg.other.map((og) => ({
        ...og,
        rows: [...og.rows].sort(byName),
      })),
    }));
    result.sort((a, b) => a.flightLabel.localeCompare(b.flightLabel, undefined, { sensitivity: "base" }));

    const otherGroups: { type: string; label: string; rows: WinningsRow[] }[] = [];
    for (const row of noFlightOther) {
      const type = (row.payout_type || "OTHER").toUpperCase();
      const groupKey = type === "OTHER" ? (row.description || "Other").trim() : type;
      let og = otherGroups.find((g) => g.type === groupKey);
      if (!og) {
        og = { type: groupKey, label: type === "OTHER" ? groupKey : payoutLabel(type), rows: [] };
        otherGroups.push(og);
      }
      og.rows.push(row);
    }

    return { flights: result, otherGroups: otherGroups.map((og) => ({ ...og, rows: [...og.rows].sort(byName) })) };
  }, [winnings]);

  // Find the specific card by card_id
  const modalCard = useMemo(() => {
    if (expandedCardId === null || !allScores) return null;
    return allScores.find((s) => s.card_id === expandedCardId) ?? null;
  }, [expandedCardId, allScores]);

  const renderClickableName = (row: WinningsRow, content: React.ReactNode) => (
    <div
      className={`wname${row.card_id ? " clickable" : ""}`}
      onClick={row.card_id ? (e) => handlePlayerClick(row, e) : undefined}
    >
      {content}
    </div>
  );

  const renderSkinRow = (row: WinningsRow) => {
    const desc = (row.description || "").trim();
    const holeMatch = desc.match(/^Hole\s+(\d+)/i);
    const hole = row.place ?? (holeMatch ? Number(mapBackNineSkinDescription(desc, row.payout_type, isBackNineEvent).replace(/^Hole\s+/i, "")) : null);
    const isScoreDesc = /^Score:\s*/i.test(desc);
    return (
      <div key={row.moneylist_id} className="winningsRow">
        {renderClickableName(row, <>
          {hole ? <span className="wplace">#{hole} </span> : null}
          {(row.lastname || "").trim()}, {(row.firstname || "").trim()}
          {row.score != null ? <span className="wscore"> ({row.score})</span> : null}
          {!row.score && isScoreDesc ? <span className="wscore"> ({desc.replace(/^Score:\s*/i, "")})</span> : null}
        </>)}
        <div className="wamount">{formatCurrency(row.amount)}</div>
      </div>
    );
  };

  const renderStrokeRow = (row: WinningsRow) => (
    <div key={row.moneylist_id} className="winningsRow">
      {renderClickableName(row, <>
        {row.place ? <span className="wplace">#{row.place} </span> : null}
        {(row.lastname || "").trim()}, {(row.firstname || "").trim()}
        {row.score != null ? <span className="wscore"> ({row.score})</span> : null}
      </>)}
      <div className="wamount">{formatCurrency(row.amount)}</div>
    </div>
  );

  return (
    <div className="page">
      <Link className="backLink" to={`/public/${courseId}/events`}>
        ← Back to Events
      </Link>

      {loading ? <div className="muted">Loading…</div> : null}
      {error ? <div className="error">{error}</div> : null}

      {event ? (
        <div className="card">
          <div className="eventHead">
            <div>
              <div className="title">{event.eventname}</div>
              <div className="meta">
                {new Date(event.start_dt).toLocaleDateString()} - {new Date(event.end_dt).toLocaleDateString()}
              </div>
            </div>
            <div className="headBtns">
              {scoresCount > 0 && winnings.length > 0 ? (
                <Link className="scoresBtn" to={`/public/${courseId}/events/${eventId}/scores`}>
                  View Scores
                </Link>
              ) : null}
              <button className="printBtn" onClick={() => window.print()}>
                Print
              </button>
            </div>
          </div>

          {cleanText(event.eventdescription) ? <div className="desc">{cleanText(event.eventdescription)}</div> : null}

          {/* Flight-based sections */}
          {flightGroups.flights.map((flight) => {
            const hasStroke = flight.gross.length > 0 || flight.net.length > 0;
            const hasSkins = flight.skinGroups.length > 0;
            const hasOther = flight.other.length > 0;
            if (!hasStroke && !hasSkins && !hasOther) return null;

            return (
              <div key={flight.flightKey} className="flightSection">
                <div className="flightHeader">{flight.flightLabel}</div>
                <div className="subEventCards">
                  {flight.gross.length > 0 ? (
                    <div className="typeCard">
                      <div className="typeTitle">Stroke Play - Gross</div>
                      <div className="typeRows">
                        {flight.gross.map(renderStrokeRow)}
                      </div>
                    </div>
                  ) : null}
                  {flight.net.length > 0 ? (
                    <div className="typeCard">
                      <div className="typeTitle">Stroke Play - Net</div>
                      <div className="typeRows">
                        {flight.net.map(renderStrokeRow)}
                      </div>
                    </div>
                  ) : null}

                  {flight.skinGroups.map((sg) => (
                    <div key={sg.type} className="typeCard">
                      <div className="typeTitle">{sg.label}</div>
                      <div className="typeRows">
                        {sg.rows.map(renderSkinRow)}
                      </div>
                    </div>
                  ))}

                  {flight.other.map((og) => (
                    <div key={og.type} className="typeCard">
                      <div className="typeTitle">{og.label}</div>
                      <div className="typeRows">
                        {og.rows.map(renderStrokeRow)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {flightGroups.otherGroups.length > 0 ? (
            <div className="flightSection">
              <div className="flightHeader">Other</div>
              <div className="subEventCards">
                {flightGroups.otherGroups.map((og) => (
                  <div key={og.type} className="typeCard">
                    <div className="typeTitle">{og.label}</div>
                    <div className="typeRows">
                      {og.rows.map((row) => (
                        <div key={row.moneylist_id} className="winningsRow">
                          <div className="wname">
                            {(row.lastname || "").trim()}, {(row.firstname || "").trim()}
                          </div>
                          <div className="wamount">{formatCurrency(row.amount)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {files.length > 0 ? (
            <div className="files">
              <div className="fileList">
                {files.map((f) => {
                  const isImage =
                    (f.content_type || "").startsWith("image/") ||
                    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.filename);
                  return (
                    <div key={f.eventfile_id} className={`fileItem${isImage ? " fileItemImage" : ""}`}>
                      {isImage ? (
                        <a href={f.url} target="_blank" rel="noreferrer">
                          <img src={f.url} alt={f.filename} className="fileImage" />
                        </a>
                      ) : (
                        <a href={f.url} target="_blank" rel="noreferrer">
                          {f.filename}
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Scorecard Popover */}
      {expandedCardId !== null ? (
        <div className="modalOverlay" onClick={() => { setExpandedCardId(null); setPopoverAnchor(null); }}>
          <div
            className="popoverContent"
            style={popoverAnchor ? { position: "absolute", top: popoverAnchor.top, left: popoverAnchor.left, minWidth: Math.min(popoverAnchor.width, 520) } : {}}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modalHeader">
              <div className="modalTitle">{expandedName}</div>
              <button className="modalClose" onClick={() => { setExpandedCardId(null); setPopoverAnchor(null); }}>✕</button>
            </div>
            {scoresLoading ? (
              <div className="muted" style={{ padding: 16 }}>Loading scorecard…</div>
            ) : !modalCard ? (
              <div className="muted" style={{ padding: 16 }}>No scorecard available</div>
            ) : (() => {
              const numholes = modalCard.numholes ?? 9;
              const startinghole = modalCard.startinghole ?? 1;
              const holeCount = numholes === 18 ? 18 : 9;
              const holes: number[] = [];
              for (let i = 0; i < holeCount; i++) holes.push(startinghole + i);
              const scores: (number | null)[] = [];
              const pars: (number | null)[] = [];
              for (let i = 0; i < holeCount; i++) {
                scores.push(modalCard[`hole${i + 1}`] ?? null);
                pars.push(modalCard[`par${startinghole + i}`] ?? null);
              }
              return (
                <div className="modalBody">
                  <div className="modalScoreGrid" style={{ gridTemplateColumns: `repeat(${holeCount}, 1fr) auto auto auto` }}>
                    {holes.map((h) => <div key={`h${h}`} className="holeNum">{h}</div>)}
                    <div className="holeNum">Gross</div>
                    <div className="holeNum">Net</div>
                    <div className="holeNum">Adj</div>
                    {pars.map((p, i) => <div key={`p${i}`} className="parCell">{p ?? ""}</div>)}
                    <div className="parCell"></div>
                    <div className="parCell"></div>
                    <div className="parCell"></div>
                    {scores.map((score, idx) => {
                      const meta = getScoreMeta(score, pars[idx]);
                      return (
                        <div key={idx} className={meta.className} style={meta.style}>
                          {meta.showEagle ? <span className="eagleIcon" aria-hidden="true">🦅</span> : null}
                          <span className="holeValue">{score ?? "—"}</span>
                        </div>
                      );
                    })}
                    <div className="totalCell">{modalCard.gross ?? "—"}</div>
                    <div className="totalCell">{modalCard.net ?? "—"}</div>
                    <div className="totalCell">{modalCard.adjustedscore ?? "—"}</div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : null}

      <style>{`
        .page { display: grid; gap: 12px; }
        .backLink {
          color: #0f172a;
          text-decoration: none;
          font-weight: 600;
          font-size: 12px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          padding: 6px 10px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          width: fit-content;
        }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; }
        .eventHead { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
        .title { font-size: 24px; font-weight: 800; color: #111827; line-height: 1.2; }
        .meta { font-size: 13px; color: #6b7280; margin-top: 3px; }
        .headBtns { display: flex; gap: 8px; align-items: flex-start; }
        .scoresBtn {
          text-decoration: none;
          background: #0f172a;
          color: #fff;
          padding: 8px 14px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
        }
        .printBtn {
          background: #f3f4f6;
          color: #0f172a;
          border: 1px solid #e5e7eb;
          padding: 8px 14px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
        }
        .printBtn:hover { background: #e5e7eb; }
        .desc { font-size: 13px; color: #374151; margin-top: 8px; }

        /* Flight sections */
        .flightSection { margin-top: 20px; }
        .flightHeader {
          font-size: 16px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #0f172a;
          padding: 10px 0 8px;
          border-bottom: 3px solid #0f172a;
          margin-bottom: 12px;
        }
        .subEventCards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 12px;
        }

        /* Cards within a flight */
        .typeCard { border: 1px solid #e5e7eb; border-radius: 10px; background: #fafafa; overflow: hidden; }
        .typeTitle {
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #0f172a;
          border-bottom: 1px solid #e5e7eb;
          background: #f3f4f6;
        }
        .twoTypes { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
        .typeBlock { border-right: 1px solid #e5e7eb; }
        .typeBlock:last-child { border-right: 0; }
        .subTypeTitle {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #64748b;
          font-weight: 700;
          padding: 6px 12px 4px;
          border-bottom: 1px solid #edf2f7;
        }
        .typeRows { display: grid; }
        .winningsRow {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: center;
          padding: 6px 12px;
          color: #374151;
          font-size: 13px;
        }
        .wname { font-weight: 600; }
        .wname.clickable { cursor: pointer; text-decoration: underline; text-decoration-color: transparent; transition: all 0.15s; }
        .wname.clickable:hover { color: #2563eb; text-decoration-color: #2563eb; }
        .wamount { font-weight: 700; color: #0f172a; text-align: right; }
        .wplace { font-weight: 700; color: #1f2937; }
        .wdesc { color: #64748b; font-weight: 500; }
        .wscore { color: #6b7280; font-weight: 500; }
        .emptyRow { color: #9ca3af; font-size: 12px; padding: 8px 12px; border-bottom: 1px solid #edf2f7; }

        /* Scorecard Popover */
        .modalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.15);
          z-index: 1000;
        }
        .popoverContent {
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1);
          max-width: 560px;
          min-width: 360px;
          overflow: hidden;
          z-index: 1001;
        }
        .modalHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }
        .modalTitle {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
        }
        .modalClose {
          background: none;
          border: none;
          font-size: 18px;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          line-height: 1;
        }
        .modalClose:hover { background: #f3f4f6; color: #374151; }
        .modalBody { padding: 18px; }
        .modalScoreGrid {
          display: grid;
          gap: 4px;
          align-items: center;
        }
        .holeNum {
          text-align: center;
          font-size: 10px;
          color: #9ca3af;
          font-weight: 600;
        }
        .parCell {
          text-align: center;
          font-size: 9px;
          color: #b0b8c4;
          font-weight: 500;
        }
        .holeCell {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          padding: 5px 0;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          color: #374151;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          border-radius: 3px;
          min-height: 28px;
        }
        .holeCell.neutral { background: #ffffff; }
        .holeCell.birdie { background: #fee2e2; color: #991b1b; }
        .holeCell.eagle { background: #ffffff; color: #991b1b; }
        .holeCell.over { border-color: #bfdbfe; }
        .eagleIcon {
          color: #f97316;
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          opacity: 0.25;
          z-index: 0;
        }
        .holeValue { position: relative; z-index: 1; }
        .totalCell {
          text-align: center;
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
        }
        .modalCardBlock { }
        .modalCardDivider { margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; }
        .modalRoundLabel {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6b7280;
          margin-bottom: 6px;
        }

        .files { margin-top: 14px; display: grid; gap: 8px; }
        .fileList { display: grid; gap: 6px; }
        .fileItem {
          background: #f9fafb;
          border-radius: 10px;
          padding: 8px 10px;
          color: #374151;
          font-size: 12px;
          text-decoration: none;
          display: grid;
          gap: 6px;
          border: 1px solid #e5e7eb;
        }
        .fileItemImage { background: transparent; border: 0; padding: 0; }
        .fileItemImage .fileImage { border: 0; }
        .fileItem a { color: #374151; text-decoration: none; }
        .fileImage {
          max-width: 320px;
          width: 100%;
          height: auto;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        .muted { color: #6b7280; font-size: 12px; }
        .error { color: #a00; font-size: 12px; }

        @media (max-width: 640px) {
          .subEventCards { grid-template-columns: 1fr; }
          .twoTypes { grid-template-columns: 1fr; }
          .typeBlock { border-right: 0; border-bottom: 1px solid #e5e7eb; }
          .typeBlock:last-child { border-bottom: 0; }
        }
        @media (max-width: 560px) {
          .eventHead { flex-direction: column; align-items: flex-start; }
        }

        @media print {
          body * { visibility: hidden; }
          .card, .card * { visibility: visible; }
          .card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            padding: 0;
            margin: 0;
          }
          .headBtns { display: none !important; }
          .backLink { display: none !important; }
          .page { padding: 0; margin: 0; }
          .flightSection { break-inside: avoid; }
          .typeCard { break-inside: avoid; }
          .subEventCards { grid-template-columns: 1fr 1fr 1fr; }
          .winningsRow { padding: 3px 8px; font-size: 11px; }
          .flightHeader { font-size: 14px; margin-bottom: 8px; }
          .typeTitle { font-size: 10px; padding: 5px 8px; }
          .subTypeTitle { font-size: 9px; padding: 4px 8px 2px; }
          .title { font-size: 20px; }
          .modalOverlay { display: none !important; }
        }
      `}</style>
    </div>
  );
}
