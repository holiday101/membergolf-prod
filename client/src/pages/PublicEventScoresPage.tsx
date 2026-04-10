import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { publicFetch } from "../api/public";

type EventRow = {
  id: number;
  eventname: string;
  start_dt: string;
  end_dt: string;
};

type ScoreRow = {
  card_id: number;
  member_id: number;
  nine_id: number | null;
  firstname: string | null;
  lastname: string | null;
  card_dt: string;
  gross: number | null;
  net: number | null;
  adjustedscore: number | null;
  handicap: number | null;
  flight_id?: number | null;
  flightname?: string | null;
  numholes: number | null;
  startinghole: number | null;
  hole1?: number | null;
  hole2?: number | null;
  hole3?: number | null;
  hole4?: number | null;
  hole5?: number | null;
  hole6?: number | null;
  hole7?: number | null;
  hole8?: number | null;
  hole9?: number | null;
  hole10?: number | null;
  hole11?: number | null;
  hole12?: number | null;
  hole13?: number | null;
  hole14?: number | null;
  hole15?: number | null;
  hole16?: number | null;
  hole17?: number | null;
  hole18?: number | null;
  par1?: number | null;
  par2?: number | null;
  par3?: number | null;
  par4?: number | null;
  par5?: number | null;
  par6?: number | null;
  par7?: number | null;
  par8?: number | null;
  par9?: number | null;
  par10?: number | null;
  par11?: number | null;
  par12?: number | null;
  par13?: number | null;
  par14?: number | null;
  par15?: number | null;
  par16?: number | null;
  par17?: number | null;
  par18?: number | null;
};

type SortField = "gross" | "name" | "net" | "handicap";

function getHoleLabels(numholes: number | null, startinghole: number | null) {
  if (numholes === 9) return startinghole === 10 ? [10, 11, 12, 13, 14, 15, 16, 17, 18] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  return startinghole === 10
    ? [10, 11, 12, 13, 14, 15, 16, 17, 18, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
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

function memberName(row: ScoreRow) {
  return `${(row.lastname || "").trim()}, ${(row.firstname || "").trim()}`;
}

function compareNullableNumber(a: number | null, b: number | null) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

function compareScoreRows(a: ScoreRow, b: ScoreRow, sortField: SortField) {
  if (sortField === "name") {
    return memberName(a).localeCompare(memberName(b), undefined, { sensitivity: "base" });
  }
  if (sortField === "gross") {
    const diff = compareNullableNumber(a.gross, b.gross);
    if (diff !== 0) return diff;
  }
  if (sortField === "net") {
    const diff = compareNullableNumber(a.net, b.net);
    if (diff !== 0) return diff;
  }
  if (sortField === "handicap") {
    const diff = compareNullableNumber(a.handicap, b.handicap);
    if (diff !== 0) return diff;
  }
  return memberName(a).localeCompare(memberName(b), undefined, { sensitivity: "base" });
}

export default function PublicEventScoresPage() {
  const { courseId, eventId } = useParams();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [hasWinnings, setHasWinnings] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("gross");

  useEffect(() => {
    const run = async () => {
      if (!courseId || !eventId) return;
      setLoading(true);
      setError("");
      try {
        const [eventRes, winningsRes] = await Promise.all([
          publicFetch<EventRow>(`/public/${courseId}/events/${eventId}`),
          publicFetch<{ moneylist_id: number }[]>(`/public/${courseId}/events/${eventId}/winnings`),
        ]);
        setEvent(eventRes);
        if (!winningsRes || winningsRes.length === 0) {
          setHasWinnings(false);
          setScores([]);
        } else {
          setHasWinnings(true);
          const scoresRes = await publicFetch<ScoreRow[]>(`/public/${courseId}/events/${eventId}/scores`);
          setScores(scoresRes);
        }
      } catch (e: any) {
        setError(e.message ?? "Failed to load scores");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [courseId, eventId]);

  const groupedByFlight = useMemo(() => {
    const map = new Map<string, { flightName: string; labels: number[]; rows: ScoreRow[] }>();
    for (const row of scores) {
      const name = row.flightname?.trim() || "All Players";
      const key = `${name}::${row.numholes ?? 9}::${row.startinghole ?? 1}`;
      const labels = getHoleLabels(row.numholes, row.startinghole);
      const current = map.get(key);
      if (current) current.rows.push(row);
      else map.set(key, { flightName: name, labels, rows: [row] });
    }
    return Array.from(map.values()).map((group) => ({
      ...group,
      rows: [...group.rows].sort((a, b) => compareScoreRows(a, b, sortField)),
    }));
  }, [scores, sortField]);

  return (
    <div className="page">
      <Link className="backLink" to={`/public/${courseId}/events/${eventId}`}>
        ← Back to Event
      </Link>

      {loading ? <div className="muted">Loading…</div> : null}
      {error ? <div className="error">{error}</div> : null}

      {event ? (
        <div className="card wideCard">
          <div className="title">{event.eventname}</div>
          <div className="meta">
            {new Date(event.start_dt).toLocaleDateString()} - {new Date(event.end_dt).toLocaleDateString()}
          </div>

          {!hasWinnings ? (
            <div className="empty">Scores are not yet available for this event.</div>
          ) : scores.length === 0 ? (
            <div className="empty">No scores posted</div>
          ) : (
            <>
              <div className="sortBar">
                <label className="sortLabel">
                  Sort By
                  <select value={sortField} onChange={(e) => setSortField(e.target.value as SortField)}>
                    <option value="gross">Gross (asc)</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="net">Net (asc)</option>
                    <option value="handicap">Hdcp (asc)</option>
                  </select>
                </label>
              </div>

              <div className="detailsList">
                {groupedByFlight.map((group, idx) => (
                  <div key={`${group.flightName}-${idx}`} className="flightSection">
                    <div className="flightHeader">{group.flightName}</div>
                    <div className="detailHeadRow">
                      <span>Name</span>
                      <span>Card Date</span>
                      <span>Hdcp</span>
                      <div className="holesHeadGrid" style={{ gridTemplateColumns: `repeat(${group.labels.length}, minmax(26px, 1fr))` }}>
                        {group.labels.map((h) => (
                          <span key={`head-${idx}-${h}`}>{h}</span>
                        ))}
                      </div>
                      <span>Gross</span>
                      <span>Net</span>
                    </div>
                    {group.rows.map((row) => (
                      <div key={row.card_id} className="detailRow">
                        <div className="detailMeta">
                          <Link className="memberTag" to={`/public/${courseId}/members/${row.member_id}`}>
                            {memberName(row)}
                          </Link>
                        </div>
                        <div className="dateCell">{new Date(row.card_dt).toLocaleDateString()}</div>
                        <div className="statCell">{typeof row.handicap === "number" ? row.handicap : "-"}</div>
                        <div className="scoreGrid" style={{ gridTemplateColumns: `repeat(${group.labels.length}, minmax(26px, 1fr))` }}>
                          {group.labels.map((h) => {
                            const storage = storageHoleNumber(h, row.numholes, row.startinghole);
                            const score = (row as any)[`hole${storage}`] as number | null | undefined;
                            const par = (row as any)[`par${storage}`] as number | null | undefined;
                            const meta = getScoreMeta(score, par);
                            return (
                              <div key={`${row.card_id}-${h}`} className={meta.className} style={meta.style}>
                                {typeof score === "number" ? score : "-"}
                              </div>
                            );
                          })}
                        </div>
                        <div className="statCell">{typeof row.gross === "number" ? row.gross : "-"}</div>
                        <div className="statCell">{typeof row.net === "number" ? row.net : "-"}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}

      <style>{`
        .page { display: grid; gap: 12px; }
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
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        .wideCard { max-width: 100%; }
        .title { font-size: 16px; font-weight: 700; color: #111827; }
        .meta { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .sortBar { margin-top: 10px; display: flex; align-items: center; gap: 8px; }
        .sortLabel { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
        .sortLabel select {
          font-size: 12px;
          color: #111827;
          border: 1px solid #d1d5db;
          background: #fff;
          border-radius: 8px;
          padding: 5px 8px;
        }
        .detailsList { display: grid; gap: 8px; margin-top: 10px; }
        .flightSection { display: grid; gap: 2px; }
        .flightHeader { font-size: 12px; font-weight: 800; color: #1e3a8a; padding: 2px 0 4px; border-bottom: 1px solid #dbeafe; }
        .detailHeadRow {
          display: grid;
          grid-template-columns: minmax(160px, 220px) minmax(86px, 96px) 52px 1fr 52px 52px;
          gap: 6px;
          align-items: center;
          color: #6b7280;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 0;
        }
        .holesHeadGrid { display: grid; gap: 2px; text-align: center; }
        .detailRow {
          display: grid;
          grid-template-columns: minmax(160px, 220px) minmax(86px, 96px) 52px 1fr 52px 52px;
          gap: 6px;
          align-items: center;
          padding: 4px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .detailMeta { min-width: 0; font-size: 11px; }
        .memberTag {
          color: #1f2937;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-decoration: none;
          display: block;
        }
        .dateCell { color: #6b7280; font-size: 11px; white-space: nowrap; text-align: left; }
        .scoreGrid { display: grid; gap: 2px; align-items: stretch; }
        .scoreCell {
          border: 1px solid #e5e7eb;
          border-radius: 3px;
          padding: 2px 0;
          font-size: 11px;
          color: #111827;
          background: #fff;
          font-weight: 600;
          text-align: center;
          display: grid;
          place-items: center;
          line-height: 1;
        }
        .scoreCell.neutral { background: #f8fafc; }
        .scoreCell.birdie { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
        .scoreCell.eagle { background: #fecaca; color: #7f1d1d; border-color: #fca5a5; font-weight: 700; }
        .statCell { text-align: center; font-size: 11px; color: #374151; font-weight: 600; }
        .empty { font-size: 12px; color: #6b7280; padding: 6px 0; }
        .muted { color: #6b7280; font-size: 12px; }
        .error { color: #a00; font-size: 12px; }
        @media (max-width: 900px) {
          .detailHeadRow { display: none; }
          .detailRow { grid-template-columns: 1fr; align-items: start; }
          .scoreGrid { grid-template-columns: repeat(9, minmax(24px, 1fr)) !important; }
          .dateCell { text-align: left; }
        }
      `}</style>
    </div>
  );
}
