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
  firstname: string | null;
  lastname: string | null;
  card_dt: string;
  gross: number | null;
  net: number | null;
  adjustedscore: number | null;
  numholes: number | null;
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
                <div>Gross</div>
                <div>Net</div>
              </div>
              {scores.map((s) => (
                <div key={s.card_id} className="scoreRow">
                  <div className="sname">
                    {(s.lastname || "").trim()}, {(s.firstname || "").trim()}
                  </div>
                  <div className="snum">{s.gross ?? "-"}</div>
                  <div className="snum">{s.net ?? "-"}</div>
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
          grid-template-columns: 1fr 70px 70px;
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
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 13px;
        }
        .sname { font-weight: 600; color: #0f172a; }
        .snum { text-align: right; font-variant-numeric: tabular-nums; }
        .empty { font-size: 12px; color: #6b7280; padding: 6px 0; }
        @media (max-width: 520px) {
          .scoreHeader,
          .scoreRow { grid-template-columns: 1fr 56px 56px; }
        }
      `}</style>
    </div>
  );
}
