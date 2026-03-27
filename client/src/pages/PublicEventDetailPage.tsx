import { useEffect, useMemo, useState } from "react";
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
};

type EventFile = {
  eventfile_id: number;
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
  url: string;
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

export default function PublicEventDetailPage() {
  const { courseId, eventId } = useParams();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [files, setFiles] = useState<EventFile[]>([]);
  const [winnings, setWinnings] = useState<WinningsRow[]>([]);
  const [scoresCount, setScoresCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

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

  const grossNetByFlight = useMemo(() => {
    const byFlight = new Map<string, { flightLabel: string; gross: WinningsRow[]; net: WinningsRow[] }>();
    for (const row of winnings) {
      const type = (row.payout_type || "").toUpperCase();
      if (type !== "GROSS" && type !== "NET") continue;
      const descriptionLabel = (row.description || "").trim();
      const flightLabel = row.flight_name ? `${row.flight_name.trim()} Flight` : row.flight_id ? `Flight ${row.flight_id}` : descriptionLabel || "Overall";
      const key = `${row.flight_id ?? "na"}::${flightLabel}`;
      const current = byFlight.get(key) ?? { flightLabel, gross: [], net: [] };
      if (type === "GROSS") current.gross.push(row);
      if (type === "NET") current.net.push(row);
      byFlight.set(key, current);
    }
    return Array.from(byFlight.values()).map((group) => ({
      ...group,
      gross: [...group.gross].sort((a, b) => (a.place ?? 999) - (b.place ?? 999) || (b.amount ?? 0) - (a.amount ?? 0)),
      net: [...group.net].sort((a, b) => (a.place ?? 999) - (b.place ?? 999) || (b.amount ?? 0) - (a.amount ?? 0)),
    }));
  }, [winnings]);

  const isBackNineEvent = (event?.numholes ?? null) === 9 && (event?.startinghole ?? null) === 10;

  const otherPayoutGroups = useMemo(() => {
    const map = new Map<string, WinningsRow[]>();
    for (const row of winnings) {
      const type = (row.payout_type || "OTHER").toUpperCase();
      if (type === "GROSS" || type === "NET") continue;
      const arr = map.get(type) ?? [];
      arr.push(row);
      map.set(type, arr);
    }
    const order = ["SKINS", "SKIN", "POWER_SKIN", "BB_GROSS", "BB_NET", "CHICAGO", "OTHER"]; // Keep Other last.
    return Array.from(map.entries())
      .sort((a, b) => {
        const ai = order.indexOf(a[0]);
        const bi = order.indexOf(b[0]);
        const av = ai === -1 ? 999 : ai;
        const bv = bi === -1 ? 999 : bi;
        if (av !== bv) return av - bv;
        return a[0].localeCompare(b[0]);
      })
      .map(([type, rows]) => ({
        type,
        label: payoutLabel(type),
        rows: [...rows].sort((x, y) => {
          const xf = x.flight_name || "";
          const yf = y.flight_name || "";
          if (xf !== yf) return xf.localeCompare(yf);
          const xp = x.place ?? 999;
          const yp = y.place ?? 999;
          if (xp !== yp) return xp - yp;
          return (y.amount ?? 0) - (x.amount ?? 0);
        }),
      }));
  }, [winnings]);

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
            {scoresCount > 0 ? (
              <Link className="scoresBtn" to={`/public/${courseId}/events/${eventId}/scores`}>
                View Scores
              </Link>
            ) : null}
          </div>

          {cleanText(event.eventdescription) ? <div className="desc">{cleanText(event.eventdescription)}</div> : null}


          <div className="winningsLayout">
            <div className="leftColumn">
              {grossNetByFlight.length === 0 ? (
                null
              ) : (
                grossNetByFlight.map((flight, idx) => (
                  <div key={`flight-${idx}`} className="typeCard">
                    <div className="typeTitle">{`${flight.flightLabel} - Stroke Play`}</div>
                    <div className="twoTypes">
                      <div className="typeBlock">
                        <div className="subTypeTitle">Gross</div>
                        {flight.gross.length === 0 ? (
                          <div className="emptyRow">No gross payouts</div>
                        ) : (
                          flight.gross.map((row) => (
                            <div key={row.moneylist_id} className="winningsRow">
                              <div className="wname">
                                {row.place ? <span className="wplace">#{row.place} </span> : null}
                                {mapBackNineSkinDescription(row.description, row.payout_type, isBackNineEvent) ? (
                                  <span className="wdesc">{mapBackNineSkinDescription(row.description, row.payout_type, isBackNineEvent)} • </span>
                                ) : null}
                                {(row.lastname || "").trim()}, {(row.firstname || "").trim()}
                                {row.score != null ? <span className="wscore"> ({row.score})</span> : null}
                              </div>
                              <div className="wamount">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(row.amount ?? 0)}</div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="typeBlock">
                        <div className="subTypeTitle">Net</div>
                        {flight.net.length === 0 ? (
                          <div className="emptyRow">No net payouts</div>
                        ) : (
                          flight.net.map((row) => (
                            <div key={row.moneylist_id} className="winningsRow">
                              <div className="wname">
                                {row.place ? <span className="wplace">#{row.place} </span> : null}
                                {(row.lastname || "").trim()}, {(row.firstname || "").trim()}
                                {row.score != null ? <span className="wscore"> ({row.score})</span> : null}
                              </div>
                              <div className="wamount">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(row.amount ?? 0)}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="rightColumn">
              {otherPayoutGroups.length === 0 ? (
                null
              ) : (
                otherPayoutGroups.flatMap((group) => {
                  if (group.type === "SKINS" || group.type === "SKIN" || group.type === "POWER_SKIN") {
                    return Array.from(
                      group.rows.reduce((map, row) => {
                        const descriptionLabel = (row.description || "").trim();
                        const flight = row.flight_name ? `${row.flight_name.trim()} Flight` : row.flight_id ? `Flight ${row.flight_id}` : descriptionLabel || "Overall";
                        const arr = map.get(flight) ?? [];
                        arr.push(row);
                        map.set(flight, arr);
                        return map;
                      }, new Map<string, WinningsRow[]>()).entries()
                    ).map(([flight, rows]) => (
                      <div key={`${group.type}-${flight}`} className="typeCard">
                        <div className="typeTitle">{`${flight} - ${group.type === "POWER_SKIN" ? "Power Skin" : "Skin"}`}</div>
                        <div className="typeRows">
                          {rows.map((row) => (
                            <div key={row.moneylist_id} className="winningsRow">
                              <div className="wname">
                                {(() => {
                                  const desc = (row.description || "").trim();
                                  const holeMatch = desc.match(/^Hole\s+(\d+)/i);
                                  const hole = row.place ?? (holeMatch ? Number(mapBackNineSkinDescription(desc, row.payout_type, isBackNineEvent).replace(/^Hole\s+/i, "")) : null);
                                  if (hole) return <span className="wplace">#{hole} </span>;
                                  return null;
                                })()}
                                {(row.lastname || "").trim()}, {(row.firstname || "").trim()}
                                {(() => {
                                  const desc = (row.description || "").trim();
                                  const isScoreDesc = /^Score:\s*/i.test(desc);
                                  if (row.score != null) return <span className="wscore"> ({row.score})</span>;
                                  if (isScoreDesc) return <span className="wscore"> ({desc.replace(/^Score:\s*/i, "")})</span>;
                                  return null;
                                })()}
                              </div>
                              <div className="wamount">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(row.amount ?? 0)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  }

                  return [
                    <div key={group.type} className="typeCard">
                      <div className="typeTitle">{group.label}</div>
                      <div className="typeRows">
                        {group.rows.map((row) => {
                          const descriptionLabel = (row.description || "").trim();
                          const flight = row.flight_name ? `${row.flight_name.trim()} Flight` : row.flight_id ? `Flight ${row.flight_id}` : descriptionLabel || "Overall";
                          return (
                            <div key={row.moneylist_id} className="rowWrap">
                              <div className="flightLabel">{flight}</div>
                              <div className="winningsRow">
                                <div className="wname">
                                  {row.place ? <span className="wplace">#{row.place} </span> : null}
                                  {(row.lastname || "").trim()}, {(row.firstname || "").trim()}
                                </div>
                                <div className="wamount">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(row.amount ?? 0)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>,
                  ];
                })
              )}
            </div>
          </div>

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
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        .eventHead { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
        .title { font-size: 24px; font-weight: 800; color: #111827; line-height: 1.2; }
        .meta { font-size: 13px; color: #6b7280; margin-top: 3px; }
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
        .desc { font-size: 13px; color: #374151; margin-top: 8px; }
        .winningsLayout { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: start; }
        .leftColumn, .rightColumn { display: grid; gap: 10px; }
        .typeCard { border: 1px solid #e5e7eb; border-radius: 10px; background: #fafafa; overflow: hidden; }
        .typeTitle {
          padding: 8px 10px;
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
          padding: 6px 10px 4px;
          border-bottom: 1px solid #edf2f7;
        }
        .typeRows { display: grid; }
        .rowWrap { border-bottom: 1px solid #edf2f7; }
        .rowWrap:last-child { border-bottom: 0; }
        .flightLabel {
          font-size: 10px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 7px 10px 3px;
        }
        .winningsRow {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: center;
          padding: 5px 10px 8px;
          color: #374151;
          font-size: 12px;
          border-bottom: 1px solid #edf2f7;
        }
        .typeRows .winningsRow:last-child,
        .typeBlock .winningsRow:last-child { border-bottom: 0; }
        .wname { font-weight: 600; }
        .wamount { font-weight: 700; color: #0f172a; text-align: right; }
        .wplace { font-weight: 700; color: #1f2937; }
        .wdesc { color: #64748b; font-weight: 500; }
        .wscore { color: #6b7280; font-weight: 500; }
        .empty { color: #9ca3af; font-size: 12px; padding: 8px 10px; }
        .emptyRow { color: #9ca3af; font-size: 11px; padding: 7px 10px; border-bottom: 1px solid #edf2f7; }
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
        .fileItemImage {
          background: transparent;
          border: 0;
          padding: 0;
        }
        .fileItemImage .fileImage {
          border: 0;
        }
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
        @media (max-width: 920px) {
          .winningsLayout { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .twoTypes { grid-template-columns: 1fr; }
          .typeBlock { border-right: 0; border-bottom: 1px solid #e5e7eb; }
          .typeBlock:last-child { border-bottom: 0; }
        }
        @media (max-width: 560px) {
          .eventHead { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}
