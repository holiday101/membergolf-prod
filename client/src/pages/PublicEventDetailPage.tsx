import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { publicFetch } from "../api/public";

type EventRow = {
  id: number;
  eventname: string;
  eventdescription: string | null;
  start_dt: string;
  end_dt: string;
  ninename?: string | null;
};

type EventFile = {
  eventfile_id: number;
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
  url: string;
};

export default function PublicEventDetailPage() {
  const { courseId, eventId } = useParams();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [files, setFiles] = useState<EventFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      if (!courseId || !eventId) return;
      setLoading(true);
      setError("");
      try {
        const [eventRes, filesRes] = await Promise.all([
          publicFetch<EventRow>(`/public/${courseId}/events/${eventId}`),
          publicFetch<EventFile[]>(`/public/${courseId}/events/${eventId}/files`),
        ]);
        setEvent(eventRes);
        setFiles(filesRes);
      } catch (e: any) {
        setError(e.message ?? "Failed to load event");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [courseId, eventId]);

  return (
    <div className="page">
      <Link className="backLink" to={`/public/${courseId}/events`}>
        ← Back to Events
      </Link>

      {loading ? <div className="muted">Loading…</div> : null}
      {error ? <div className="error">{error}</div> : null}

      {event ? (
        <div className="card">
          <div className="title">{event.eventname}</div>
          <div className="meta">
            {new Date(event.start_dt).toLocaleDateString()} – {new Date(event.end_dt).toLocaleDateString()}
            {event.ninename ? ` • ${event.ninename}` : ""}
          </div>
          {event.eventdescription ? <div className="desc">{event.eventdescription}</div> : null}

          <div className="files">
            <div className="filesTitle">Results</div>
            {files.length === 0 ? (
              <div className="empty">No uploads yet</div>
            ) : (
              <div className="fileList">
                {files.map((f) => {
                  const isImage =
                    (f.content_type || "").startsWith("image/") ||
                    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.filename);
                  return (
                    <div key={f.eventfile_id} className="fileItem">
                      {isImage ? (
                        <a href={f.url} target="_blank" rel="noreferrer">
                          <img src={f.url} alt={f.filename} className="fileImage" />
                        </a>
                      ) : (
                        <a href={f.url} target="_blank" rel="noreferrer">
                          {f.filename}
                        </a>
                      )}
                      {!isImage ? null : (
                        <a className="fileCaption" href={f.url} target="_blank" rel="noreferrer">
                          {f.filename}
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        .title { font-size: 18px; font-weight: 700; color: #111827; }
        .meta { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .desc { font-size: 13px; color: #374151; margin-top: 10px; }
        .files { margin-top: 14px; display: grid; gap: 8px; }
        .filesTitle { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; }
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
        }
        .fileItem:hover { background: #eef2ff; }
        .fileItem a { color: #374151; text-decoration: none; }
        .fileItem a:hover { text-decoration: underline; }
        .fileImage {
          max-width: 320px;
          width: 100%;
          height: auto;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        .fileCaption { font-size: 11px; color: #6b7280; }
        .empty { color: #9ca3af; font-size: 12px; }
        .muted { color: #6b7280; font-size: 12px; }
        .error { color: #a00; font-size: 12px; }
      `}</style>
    </div>
  );
}
