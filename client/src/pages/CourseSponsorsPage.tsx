import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../auth";

type Course = {
  course_id: number;
  coursename: string | null;
  titlesponsor_link: string | null;
  titlesponsor: string | null;
  titlesponsor_url?: string | null;
};

type Sponsor = {
  sponsor_id: number;
  course_id: number;
  website: string | null;
  logo: string | null;
  logo_url?: string | null;
};

export default function CourseSponsorsPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const courseIdNum = courseId ? Number(courseId) : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [course, setCourse] = useState<Course | null>(null);
  const [titleSponsorLink, setTitleSponsorLink] = useState("");

  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [adding, setAdding] = useState(false);
  const [edits, setEdits] = useState<Record<number, { website: string }>>({});

  const successTimer = useRef<number | null>(null);

  function flashSuccess(message: string) {
    if (successTimer.current) window.clearTimeout(successTimer.current);
    setSuccess(message);
    successTimer.current = window.setTimeout(() => setSuccess(""), 1500);
  }

  async function loadData() {
    if (!courseIdNum || !Number.isFinite(courseIdNum)) {
      setError("Invalid course id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const meRes = await apiFetch("/me");
      if (!meRes.ok) throw new Error(await meRes.text());
      const me = await meRes.json();
      if (!me?.user?.isAdmin) {
        navigate("/calendar", { replace: true });
        return;
      }

      const [coursesRes, sponsorsRes] = await Promise.all([
        apiFetch("/courses/manage"),
        apiFetch(`/courses/manage/${courseIdNum}/sponsors`),
      ]);
      if (!coursesRes.ok) throw new Error(await coursesRes.text());
      if (!sponsorsRes.ok) throw new Error(await sponsorsRes.text());

      const courses: Course[] = await coursesRes.json();
      const match = courses.find((c) => c.course_id === courseIdNum) || null;
      if (!match) {
        setError("Course not found");
        return;
      }
      setCourse(match);
      setTitleSponsorLink(match.titlesponsor_link ?? "");

      const sponsorRows: Sponsor[] = await sponsorsRes.json();
      setSponsors(sponsorRows);
      const nextEdits: Record<number, { website: string }> = {};
      for (const s of sponsorRows) {
        nextEdits[s.sponsor_id] = { website: s.website ?? "" };
      }
      setEdits(nextEdits);
    } catch (err: any) {
      setError(String(err?.message || "Failed to load sponsors"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    return () => {
      if (successTimer.current) window.clearTimeout(successTimer.current);
    };
  }, []);

  async function saveTitleSponsorLink() {
    if (!courseIdNum) return;
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/courses/manage/${courseIdNum}`, {
        method: "PUT",
        body: JSON.stringify({ titlesponsor_link: titleSponsorLink.trim() || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadData();
      flashSuccess("Title sponsor saved.");
    } catch (err: any) {
      setError(String(err?.message || "Save failed"));
    } finally {
      setBusy(false);
    }
  }

  async function uploadTitleSponsorLogo(file: File) {
    if (!courseIdNum) return;
    setUploading(true);
    setError("");
    try {
      const presignRes = await apiFetch(`/courses/manage/${courseIdNum}/assets/presign`, {
        method: "POST",
        body: JSON.stringify({
          field: "titlesponsor",
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });
      if (!presignRes.ok) throw new Error(await presignRes.text());
      const { uploadUrl, fileKey } = await presignRes.json();

      const uploadRes = await fetch(uploadUrl, { method: "PUT", body: file });
      if (!uploadRes.ok) throw new Error("Upload failed");

      const res = await apiFetch(`/courses/manage/${courseIdNum}`, {
        method: "PUT",
        body: JSON.stringify({ titlesponsor: fileKey }),
      });
      if (!res.ok) throw new Error(await res.text());

      await loadData();
      flashSuccess("Title sponsor logo uploaded.");
    } catch (err: any) {
      setError(String(err?.message || "Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  async function deleteTitleSponsorLogo() {
    if (!courseIdNum) return;
    setUploading(true);
    setError("");
    try {
      const res = await apiFetch(`/courses/manage/${courseIdNum}/assets/titlesponsor`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      await loadData();
      flashSuccess("Title sponsor logo deleted.");
    } catch (err: any) {
      setError(String(err?.message || "Delete failed"));
    } finally {
      setUploading(false);
    }
  }

  async function addSponsor() {
    if (!courseIdNum) return;
    setAdding(true);
    setError("");
    try {
      const res = await apiFetch(`/courses/manage/${courseIdNum}/sponsors`, {
        method: "POST",
        body: JSON.stringify({ website: null }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadData();
      flashSuccess("Sponsor added.");
    } catch (err: any) {
      setError(String(err?.message || "Add failed"));
    } finally {
      setAdding(false);
    }
  }

  async function saveSponsor(sponsorId: number) {
    if (!courseIdNum) return;
    const edit = edits[sponsorId];
    if (!edit) return;
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/courses/manage/${courseIdNum}/sponsors/${sponsorId}`, {
        method: "PUT",
        body: JSON.stringify({ website: edit.website.trim() || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadData();
      flashSuccess("Sponsor saved.");
    } catch (err: any) {
      setError(String(err?.message || "Save failed"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteSponsor(sponsorId: number) {
    if (!courseIdNum) return;
    const ok = window.confirm("Delete this sponsor? This cannot be undone.");
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/courses/manage/${courseIdNum}/sponsors/${sponsorId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      await loadData();
      flashSuccess("Sponsor deleted.");
    } catch (err: any) {
      setError(String(err?.message || "Delete failed"));
    } finally {
      setBusy(false);
    }
  }

  async function uploadSponsorLogo(sponsorId: number, file: File) {
    if (!courseIdNum) return;
    setUploading(true);
    setError("");
    try {
      const presignRes = await apiFetch(
        `/courses/manage/${courseIdNum}/sponsors/${sponsorId}/assets/presign`,
        {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
          }),
        }
      );
      if (!presignRes.ok) throw new Error(await presignRes.text());
      const { uploadUrl, fileKey } = await presignRes.json();

      const uploadRes = await fetch(uploadUrl, { method: "PUT", body: file });
      if (!uploadRes.ok) throw new Error("Upload failed");

      const res = await apiFetch(`/courses/manage/${courseIdNum}/sponsors/${sponsorId}`, {
        method: "PUT",
        body: JSON.stringify({ logo: fileKey }),
      });
      if (!res.ok) throw new Error(await res.text());

      await loadData();
      flashSuccess("Sponsor logo uploaded.");
    } catch (err: any) {
      setError(String(err?.message || "Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  async function deleteSponsorLogo(sponsorId: number) {
    if (!courseIdNum) return;
    setUploading(true);
    setError("");
    try {
      const res = await apiFetch(
        `/courses/manage/${courseIdNum}/sponsors/${sponsorId}/assets/logo`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(await res.text());
      await loadData();
      flashSuccess("Sponsor logo deleted.");
    } catch (err: any) {
      setError(String(err?.message || "Delete failed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="page">
      <div className="topRow">
        <Link className="backLink" to="/sponsors">
          ← Back to Sponsors
        </Link>
      </div>

      {error && (
        <div className="alert">
          <strong>Error:</strong> {error}
        </div>
      )}
      {success ? <div className="toast success">{success}</div> : null}

      {loading ? (
        <div className="muted">Loading…</div>
      ) : (
        <div className="grid">
          <section className="card">
            <div className="cardHeader">{course?.coursename ?? "Course"} — Title Sponsor</div>
            <div className="logoRow">
              <label className="formLabel wideField">
                Title Sponsor Website
                <input
                  value={titleSponsorLink}
                  onChange={(e) => setTitleSponsorLink(e.target.value)}
                />
              </label>

              <div className="assetBlock compactAsset">
                <div className="assetTitle">Title Sponsor Logo</div>
                <div className="uploadRow">
                  {course?.titlesponsor_url ? (
                    <div className="assetPreviewRow">
                      <img
                        src={course.titlesponsor_url || ""}
                        alt="Title sponsor preview"
                        className="assetPreview"
                      />
                      <button
                        type="button"
                        className="iconBtn iconBtn-sm"
                        onClick={deleteTitleSponsorLogo}
                        disabled={uploading}
                        aria-label="Delete title sponsor logo"
                      >
                        🗑
                      </button>
                    </div>
                  ) : (
                    <label className="fileBtn">
                      Upload Logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadTitleSponsorLogo(file);
                          e.currentTarget.value = "";
                        }}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
            <div className="actions">
              <button className="btn primary" onClick={saveTitleSponsorLink} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </section>

          <section className="card">
            <div className="cardHeader">Other Sponsors</div>

            {sponsors.length === 0 ? (
              <div className="muted">No sponsors added yet.</div>
            ) : (
              <div className="sponsorList">
                {sponsors.map((s) => {
                  const edit = edits[s.sponsor_id] ?? { website: "" };
                  return (
                    <div key={s.sponsor_id} className="sponsorCard">
                      <div className="logoRow">
                        <label className="formLabel wideField">
                          Sponsor Website
                          <input
                            value={edit.website}
                            onChange={(e) =>
                              setEdits((prev) => ({
                                ...prev,
                                [s.sponsor_id]: { website: e.target.value },
                              }))
                            }
                          />
                        </label>

                        <div className="assetBlock compactAsset">
                          <div className="assetTitle">Sponsor Logo</div>
                          <div className="uploadRow">
                            {s.logo_url ? (
                              <div className="assetPreviewRow">
                                <img src={s.logo_url} alt="Sponsor logo preview" className="assetPreview" />
                                <button
                                  type="button"
                                  className="iconBtn iconBtn-sm"
                                  onClick={() => deleteSponsorLogo(s.sponsor_id)}
                                  disabled={uploading}
                                  aria-label="Delete sponsor logo"
                                >
                                  🗑
                                </button>
                              </div>
                            ) : (
                              <label className="fileBtn">
                                Upload Logo
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) uploadSponsorLogo(s.sponsor_id, file);
                                    e.currentTarget.value = "";
                                  }}
                                  disabled={uploading}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="actions">
                        <button className="btn primary" onClick={() => saveSponsor(s.sponsor_id)} disabled={busy}>
                          {busy ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          className="iconDanger"
                          onClick={() => deleteSponsor(s.sponsor_id)}
                          disabled={busy}
                          aria-label="Delete sponsor"
                          title="Delete sponsor"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button className="btn primary addSponsorBtn" onClick={addSponsor} disabled={adding}>
              {adding ? "Adding…" : "+ Add Sponsor"}
            </button>
          </section>
        </div>
      )}

      <style>{`
        .page { display: grid; gap: 14px; }
        .topRow { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
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
        .grid { display: grid; gap: 14px; grid-template-columns: 1fr; }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; display: grid; gap: 12px; }
        .cardHeader { font-size: 14px; font-weight: 700; color: #374151; }
        .logoRow {
          display: grid;
          gap: 12px;
          grid-template-columns: minmax(220px, 1fr) minmax(120px, 180px);
          align-items: end;
        }
        .formLabel { color: #6b7280; display: grid; gap: 4px; font-weight: 600; font-size: 12px; }
        .formLabel input { width: 100%; max-width: 100%; }
        .assetBlock { display: grid; gap: 6px; }
        .compactAsset { align-content: start; }
        .assetTitle { font-size: 12px; font-weight: 600; color: #6b7280; }
        input { padding: 8px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 13px; }
        .uploadRow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .fileBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 0 14px;
          height: 36px;
          font-size: 12px;
          font-weight: 600;
          background: #f8fafc;
          color: #374151;
          cursor: pointer;
          min-width: 120px;
        }
        .fileBtn input { display: none; }
        .assetPreviewRow { display: flex; align-items: center; gap: 8px; }
        .assetPreview {
          width: 70px;
          height: 40px;
          object-fit: contain;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #fff;
          padding: 4px;
          flex: 0 0 auto;
        }
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
        .iconBtn-sm { width: 20px; height: 20px; font-size: 11px; }
        .iconBtn:disabled { opacity: 0.6; cursor: not-allowed; }
        .actions { display: flex; justify-content: flex-end; gap: 8px; }
        .btn { border: 1px solid #d1d5db; background: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; text-decoration: none; }
        .btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .btn.small { padding: 5px 8px; font-size: 11px; }
        .sponsorList { display: grid; gap: 14px; }
        .sponsorCard {
          display: grid;
          gap: 10px;
          padding-top: 12px;
          border-top: 1px solid #f3f4f6;
        }
        .sponsorList .sponsorCard:first-child { padding-top: 0; border-top: 0; }
        .addSponsorBtn { justify-self: start; }
        .iconDanger {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid #fecaca;
          background: #fff1f2;
          color: #b91c1c;
          cursor: pointer;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .iconDanger:disabled { opacity: 0.6; cursor: not-allowed; }
        .alert { padding: 10px 12px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; color: #991b1b; }
        .toast { padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; width: fit-content; }
        .toast.success { border: 1px solid #bbf7d0; background: #ecfdf3; color: #166534; }
        .muted { color: #6b7280; font-size: 12px; }
        @media (max-width: 700px) {
          .logoRow { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
