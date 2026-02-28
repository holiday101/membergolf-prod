import { useEffect, useState } from "react";
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
};

export default function PublicEventScoresPage() {
  const { courseId, eventId } = useParams();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      if (!courseId || !eventId) return;
      setLoading(true);
      setError("");
      try {
        const [eventRes, scoresRes] = await Promise.all([
          publicFetch<EventRow>(`/public/${courseId}/events/${eventId}`),
          publicFetch<ScoreRow[]>(`/public/${courseId}/events/${eventId}/scores`),
        ]);
        setEvent(eventRes);
        setScores(scoresRes);
      } catch (e: any) {
        setError(e.message ?? "Failed to load scores");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [courseId, eventId]);

  const formatDate = (value: string) => {
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleDateString();
  };

  const formatNum = (value: number | null) => (typeof value === "number" ? value : "—");
  const getHoleLabels = (numholes: number | null, startinghole: number | null) => {
    if (numholes === 9) return startinghole === 10 ? [10, 11, 12, 13, 14, 15, 16, 17, 18] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
    return startinghole === 10
      ? [10, 11, 12, 13, 14, 15, 16, 17, 18, 1, 2, 3, 4, 5, 6, 7, 8, 9]
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  };
  const getHoleScores = (row: ScoreRow, labels: number[]) => {
    if (row.numholes === 9 && row.startinghole === 10) {
      return labels.map((_, idx) => (row as any)[`hole${idx + 1}`] ?? null);
    }
    return labels.map((hole) => (row as any)[`hole${hole}`] ?? null);
  };

  return (
    <div className="page">
      <Link className="backLink" to={`/public/${courseId}/events/${eventId}`}>
        ← Back to Event
      </Link>

      {loading ? <div className="muted">Loading…</div> : null}
      {error ? <div className="error">{error}</div> : null}

      {event ? (
        <div className="card">
          <div className="title">{event.eventname}</div>
          <div className="meta">
            {new Date(event.start_dt).toLocaleDateString()} – {new Date(event.end_dt).toLocaleDateString()}
          </div>

          {scores.length === 0 ? (
            <div className="empty">No scores posted</div>
          ) : (
            <div className="scoreList">
              <div className="scoreHeader">
                <div>Player</div>
                <div>Date</div>
                <div>Holes</div>
                <div>Gross</div>
                <div>Net</div>
                <div>Adj</div>
              </div>
              {scores.map((s) => (
                <div key={s.card_id} className="scoreCard">
                  <div className="scoreRow">
                    <div className="snameCell">
                      <Link className="sname" to={`/public/${courseId}/members/${s.member_id}`}>
                        {(s.lastname || "").trim()}, {(s.firstname || "").trim()}
                      </Link>
                    </div>
                    <div className="sdate">{formatDate(s.card_dt)}</div>
                    <div className="snum">{formatNum(s.numholes)}</div>
                    <div className="snum">{formatNum(s.gross)}</div>
                    <div className="snum">{formatNum(s.net)}</div>
                    <div className="snum">{formatNum(s.adjustedscore)}</div>
                  </div>
                  {(() => {
                    const labels = getHoleLabels(s.numholes, s.startinghole);
                    const values = getHoleScores(s, labels);
                    return (
                      <div className="holesWrap">
                        <div className="holesGrid" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(22px, 1fr))` }}>
                          {labels.map((h) => (
                            <div key={`h-${s.card_id}-${h}`} className="holeHead">{h}</div>
                          ))}
                        </div>
                        <div className="holesGrid" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(22px, 1fr))` }}>
                          {values.map((v, idx) => (
                            <div key={`v-${s.card_id}-${idx}`} className="holeVal">{typeof v === "number" ? v : "—"}</div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
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
        .title { font-size: 18px; font-weight: 700; color: #111827; }
        .meta { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .scoreList { margin-top: 12px; display: grid; gap: 6px; }
        .scoreHeader,
        .scoreRow {
          display: grid;
          grid-template-columns: minmax(160px, 1fr) 90px 56px 56px 56px 56px;
          gap: 8px;
          align-items: center;
        }
        .scoreHeader {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #6b7280;
          font-weight: 700;
        }
        .scoreRow {
          padding: 8px 10px;
          font-size: 13px;
        }
        .scoreCard {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
        }
        .snameCell { min-width: 0; }
        .sname {
          font-weight: 600;
          color: #0f172a;
          text-decoration: none;
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sdate { color: #475569; font-size: 12px; }
        .snum { text-align: right; font-variant-numeric: tabular-nums; }
        .holesWrap {
          border-top: 1px solid #e2e8f0;
          padding: 8px 10px 10px;
          display: grid;
          gap: 4px;
        }
        .holesGrid { display: grid; gap: 4px; }
        .holeHead {
          font-size: 10px;
          text-align: center;
          color: #64748b;
          font-weight: 700;
        }
        .holeVal {
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
          background: #ffffff;
          border: 1px solid #dbeafe;
          border-radius: 6px;
          padding: 2px 0;
          font-variant-numeric: tabular-nums;
        }
        .empty { font-size: 12px; color: #6b7280; padding: 6px 0; }
        @media (max-width: 520px) {
          .scoreHeader,
          .scoreRow { grid-template-columns: minmax(120px, 1fr) 82px 48px 48px 48px 48px; }
          .scoreRow { font-size: 12px; }
          .sdate { font-size: 11px; }
        }
      `}</style>
    </div>
  );
}
