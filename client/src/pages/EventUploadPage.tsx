import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../auth";

type EventFile = {
  eventfile_id: number;
  event_id: number;
  file_key: string;
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
  url: string;
};

type EventRow = {
  id: number;
  eventname: string;
  start_dt: string;
  end_dt: string;
  ninename?: string | null;
};

export default function EventUploadPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [files, setFiles] = useState<EventFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function loadData() {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const [eventRes, filesRes] = await Promise.all([
        apiFetch(`/api/events/${id}`),
        apiFetch(`/api/events/${id}/files`),
      ]);
      if (!eventRes.ok) throw new Error(await eventRes.text());
      if (!filesRes.ok) throw new Error(await filesRes.text());
      setEvent(await eventRes.json());
      setFiles(await filesRes.json());
    } catch (e: any) {
      setError(e.message ?? "Failed to load uploads");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);


  async function handleUpload(file: File) {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const presignRes = await apiFetch(`/api/events/${id}/files/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
        }),
      });
      if (!presignRes.ok) throw new Error(await presignRes.text());
      const { uploadUrl, fileKey } = await presignRes.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      const createRes = await apiFetch(`/api/events/${id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileKey,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
        }),
      });
      if (!createRes.ok) throw new Error(await createRes.text());
      await loadData();
    } catch (e: any) {
      setError(e.message ?? "Failed to upload");
    } finally {
      setBusy(false);
    }
  }

  async function deleteFile(fileId: number) {
    if (!id) return;
    if (!confirm("Delete this file?")) return;
    setDeleteId(fileId);
    setError("");
    try {
      const res = await apiFetch(`/api/events/${id}/files/${fileId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await loadData();
    } catch (e: any) {
      setError(e.message ?? "Failed to delete file");
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="page">
      <div className="eventHeader">
        <Link className="backLink" to={`/events/${id}`}>
          ← Back to Event
        </Link>
        <div className="eventTitle">{event?.eventname ?? "Event"}</div>
      </div>
      <div className="card">
        <div className="headerRow">
          <div>
            <div className="title">Upload Results</div>
          {event ? <div className="subtitle">Upload files for this event.</div> : null}
          </div>
          <label className="uploadBtn">
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.currentTarget.value = "";
              }}
              disabled={busy}
            />
            {busy ? "Uploading…" : "Upload File"}
          </label>
        </div>

        {loading ? <div className="muted">Loading…</div> : null}
        {error ? <div className="error">{error}</div> : null}

        {files.length > 0 ? (
          <div className="table">
            <div className="tableHead">
              <span>File</span>
              <span>Type</span>
              <span>Size</span>
              <span>Date</span>
              <span></span>
            </div>
            {files.map((f) => (
              <div key={f.eventfile_id} className="tableRow">
                <a href={f.url} target="_blank" rel="noreferrer">
                  {f.filename}
                </a>
                <span>{f.content_type ?? "—"}</span>
                <span>{f.size_bytes ? `${Math.round(f.size_bytes / 1024)} KB` : "—"}</span>
                <span>{new Date(f.uploaded_at).toLocaleDateString()}</span>
                <button
                  className="iconBtn"
                  onClick={() => deleteFile(f.eventfile_id)}
                  disabled={deleteId === f.eventfile_id}
                  aria-label="Delete file"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <style>{`
        .page { display: grid; gap: 12px; }
        .eventHeader { display: flex; align-items: center; gap: 10px; }
        .eventTitle { font-size: 16px; font-weight: 700; color: #111827; }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
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
        .headerRow { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .title { font-size: 16px; font-weight: 700; color: #111827; }
        .subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .uploadBtn {
          background: #0f172a; color: #fff; border-radius: 10px; padding: 6px 12px;
          font-size: 12px; font-weight: 600; cursor: pointer;
        }
        .uploadBtn input { display: none; }
        .table { display: grid; gap: 6px; margin-top: 12px; }
        .tableHead, .tableRow {
          display: grid; grid-template-columns: 1.6fr 1fr 0.6fr 0.7fr 34px; gap: 8px; align-items: center;
        }
        .tableHead { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; }
        .tableRow {
          background: #f9fafb; border-radius: 10px; padding: 6px 8px; color: #374151;
          font-size: 12px; text-decoration: none;
        }
        .tableRow:hover { background: #eef2ff; }
        .tableRow a { color: #374151; text-decoration: none; }
        .tableRow a:hover { text-decoration: underline; }
        .iconBtn {
          width: 24px; height: 24px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          background: #fff;
          cursor: pointer;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .iconBtn:disabled { opacity: 0.6; cursor: not-allowed; }
        .empty { color: #9ca3af; font-size: 12px; padding: 6px 0; }
        .muted { color: #6b7280; font-size: 12px; }
        .error { color: #a00; font-size: 12px; margin-top: 8px; }
      `}</style>
    </div>
  );
}
