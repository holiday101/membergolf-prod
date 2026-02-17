import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../auth";

type Course = {
  course_id: number;
  coursename: string | null;
  leagueinfo: string | null;
  website: string | null;
  titlesponsor_link: string | null;
  payout: number | null;
  cardsused: number | null;
  cardsmax: number | null;
  handicap_yn: number | null;
  decimalhandicap_yn: number | null;
  active_yn: number | null;
  logo: string | null;
  titlesponsor: string | null;
  logo_url?: string | null;
  titlesponsor_url?: string | null;
};

type FormState = {
  coursename: string;
  leagueinfo: string;
  website: string;
  titlesponsor_link: string;
  payout: string;
  cardsused: string;
  cardsmax: string;
  handicap_yn: string;
  decimalhandicap_yn: string;
  active_yn: string;
  logo: string;
  titlesponsor: string;
};

const emptyForm: FormState = {
  coursename: "",
  leagueinfo: "",
  website: "",
  titlesponsor_link: "",
  payout: "",
  cardsused: "",
  cardsmax: "",
  handicap_yn: "",
  decimalhandicap_yn: "",
  active_yn: "1",
  logo: "",
  titlesponsor: "",
};

export default function CourseListPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const successTimer = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isGlobal, setIsGlobal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive">("active");
  const leagueInfoRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const isEditing = editingId !== null;
  const sortedCourses = [...courses].sort((a, b) => {
    const aActive = a.active_yn ?? 0;
    const bActive = b.active_yn ?? 0;
    if (aActive !== bActive) return bActive - aActive;
    const aName = (a.coursename ?? "").toLowerCase();
    const bName = (b.coursename ?? "").toLowerCase();
    return aName.localeCompare(bName);
  });
  const visibleCourses = sortedCourses.filter((course) =>
    statusFilter === "active" ? (course.active_yn ?? 0) === 1 : (course.active_yn ?? 0) === 0
  );

  async function loadData() {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const meRes = await apiFetch("/me");
      if (!meRes.ok) throw new Error(await meRes.text());
      const me = await meRes.json();
      setIsGlobal(!me?.user?.courseId);
      if (!me?.user?.isAdmin) {
        navigate("/calendar", { replace: true });
        return;
      }

      const res = await apiFetch("/courses/manage");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCourses(data);

      if (!me?.user?.courseId && data.length === 1 && !isEditing) {
        beginEdit(data[0]);
      }
      if (me?.user?.courseId && data.length === 1 && !isEditing) {
        beginEdit(data[0]);
      }
    } catch (err: any) {
      setError(String(err?.message || "Failed to load courses"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [navigate]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function beginEdit(course: Course) {
    setEditingId(course.course_id);
    setForm({
      coursename: course.coursename ?? "",
      leagueinfo: course.leagueinfo ?? "",
      website: course.website ?? "",
      titlesponsor_link: course.titlesponsor_link ?? "",
      payout: course.payout != null ? String(course.payout) : "",
      cardsused: course.cardsused != null ? String(course.cardsused) : "",
      cardsmax: course.cardsmax != null ? String(course.cardsmax) : "",
      handicap_yn: course.handicap_yn != null ? String(course.handicap_yn) : "",
      decimalhandicap_yn: course.decimalhandicap_yn != null ? String(course.decimalhandicap_yn) : "",
      active_yn: course.active_yn != null ? String(course.active_yn) : "1",
      logo: course.logo ?? "",
      titlesponsor: course.titlesponsor ?? "",
    });
  }

  useEffect(() => {
    if (!leagueInfoRef.current) return;
    if (leagueInfoRef.current.innerHTML !== form.leagueinfo) {
      leagueInfoRef.current.innerHTML = form.leagueinfo || "";
    }
  }, [form.leagueinfo]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submit() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const payload: any = {
        coursename: form.coursename.trim(),
        leagueinfo: form.leagueinfo.trim() || null,
        website: form.website.trim() || null,
        titlesponsor_link: form.titlesponsor_link.trim() || null,
        payout: form.payout ? Number(form.payout) : null,
        cardsused: form.cardsused ? Number(form.cardsused) : null,
        cardsmax: form.cardsmax ? Number(form.cardsmax) : null,
        handicap_yn: form.handicap_yn ? Number(form.handicap_yn) : null,
        decimalhandicap_yn: form.decimalhandicap_yn ? Number(form.decimalhandicap_yn) : null,
        active_yn: form.active_yn ? Number(form.active_yn) : null,
        logo: form.logo || null,
        titlesponsor: form.titlesponsor || null,
      };

      const res = await apiFetch(
        isEditing ? `/courses/manage/${editingId}` : "/courses/manage",
        {
          method: isEditing ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
      }

      await loadData();
      if (isGlobal && !isEditing) resetForm();
      if (successTimer.current) window.clearTimeout(successTimer.current);
      setSuccess("Changes saved.");
      successTimer.current = window.setTimeout(() => setSuccess(""), 1000);
    } catch (err: any) {
      setError(String(err?.message || "Request failed"));
    } finally {
      setBusy(false);
    }
  }

  async function uploadAsset(field: "logo" | "titlesponsor", file: File) {
    if (!editingId) return;
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const presignRes = await apiFetch(`/courses/manage/${editingId}/assets/presign`, {
        method: "POST",
        body: JSON.stringify({
          field,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });
      if (!presignRes.ok) throw new Error(await presignRes.text());
      const { uploadUrl, fileKey } = await presignRes.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      const res = await apiFetch(`/courses/manage/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({ [field]: fileKey }),
      });
      if (!res.ok) throw new Error(await res.text());
      setForm((prev) => ({ ...prev, [field]: fileKey }));
      await loadData();
      if (successTimer.current) window.clearTimeout(successTimer.current);
      setSuccess("Asset uploaded.");
      successTimer.current = window.setTimeout(() => setSuccess(""), 1000);
    } catch (err: any) {
      setError(String(err?.message || "Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  async function deleteAsset(field: "logo" | "titlesponsor") {
    if (!editingId) return;
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch(`/courses/manage/${editingId}/assets/${field}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      setForm((prev) => ({ ...prev, [field]: "" }));
      await loadData();
      if (successTimer.current) window.clearTimeout(successTimer.current);
      setSuccess("Asset deleted.");
      successTimer.current = window.setTimeout(() => setSuccess(""), 1000);
    } catch (err: any) {
      setError(String(err?.message || "Delete failed"));
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (successTimer.current) window.clearTimeout(successTimer.current);
    };
  }, []);

  return (
    <div className="page">
      {error && (
        <div className="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid">
        <div className="split">
          <section className="card">
            <div className="form">
              <label className="formLabel">
                Course Name {editingId ? `ID:${editingId}` : ""}
                <input
                  value={form.coursename}
                  onChange={(e) => setField("coursename", e.target.value)}
                />
              </label>

              <label className="formLabel">
                League Info
                <div
                  ref={leagueInfoRef}
                  className="wysiwyg"
                  contentEditable
                  role="textbox"
                  aria-multiline="true"
                  onInput={(e) =>
                    setField("leagueinfo", (e.currentTarget as HTMLDivElement).innerHTML)
                  }
                />
              </label>

              <div className="logoRow">
                <label className="formLabel wideField">
                  Logo Website
                  <input
                    value={form.website}
                    onChange={(e) => setField("website", e.target.value)}
                  />
                </label>

                <div className="assetBlock compactAsset">
                  <div className="assetTitle">Logo</div>
                  <div className="uploadRow">
                    {courses.find((c) => c.course_id === editingId)?.logo_url ? (
                      <div className="assetPreviewRow">
                        <img
                          src={courses.find((c) => c.course_id === editingId)?.logo_url || ""}
                          alt="Logo preview"
                          className="assetPreview"
                        />
                        <button
                          type="button"
                          className="iconBtn iconBtn-sm"
                          onClick={() => deleteAsset("logo")}
                          disabled={uploading}
                          aria-label="Delete logo"
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
                            if (file) uploadAsset("logo", file);
                            e.currentTarget.value = "";
                          }}
                          disabled={!editingId || uploading}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="form">
              <div className="row">
                <label className="formLabel">
                  Payout
                  <input
                    className="inputNormal"
                    value={form.payout}
                    onChange={(e) => setField("payout", e.target.value)}
                  />
                </label>
                <label className="formLabel">
                  Cards Used
                  <input
                    className="inputNormal"
                    value={form.cardsused}
                    onChange={(e) => setField("cardsused", e.target.value)}
                  />
                </label>
              </div>

              <div className="row">
                <label className="formLabel">
                  Cards Max
                  <input
                    className="inputNormal"
                    value={form.cardsmax}
                    onChange={(e) => setField("cardsmax", e.target.value)}
                  />
                </label>
                <label className="formLabel checkbox">
                  <input
                    type="checkbox"
                    checked={form.handicap_yn === "1"}
                    onChange={(e) => setField("handicap_yn", e.target.checked ? "1" : "0")}
                  />
                  <span className="checkboxLabel">Handicap Y/N</span>
                </label>
                <label className="formLabel checkbox">
                  <input
                    type="checkbox"
                    checked={form.decimalhandicap_yn === "1"}
                    onChange={(e) => setField("decimalhandicap_yn", e.target.checked ? "1" : "0")}
                  />
                  <span className="checkboxLabel">Decimal Handicap Y/N</span>
                </label>
              </div>

              <div className="row">
                {isGlobal ? (
                  <label className="formLabel checkbox">
                    <input
                      type="checkbox"
                      checked={form.active_yn === "1"}
                      onChange={(e) => setField("active_yn", e.target.checked ? "1" : "0")}
                    />
                    <span className="checkboxLabel">Active Y/N</span>
                  </label>
                ) : null}
              </div>

              <div className="logoRow">
                <label className="formLabel wideField">
                  Title Sponsor Website
                  <input
                    value={form.titlesponsor_link}
                    onChange={(e) => setField("titlesponsor_link", e.target.value)}
                  />
                </label>

                <div className="assetBlock compactAsset">
                  <div className="assetTitle">Title Sponsor</div>
                  <div className="uploadRow">
                    {courses.find((c) => c.course_id === editingId)?.titlesponsor_url ? (
                      <div className="assetPreviewRow">
                        <img
                          src={courses.find((c) => c.course_id === editingId)?.titlesponsor_url || ""}
                          alt="Title sponsor preview"
                          className="assetPreview"
                        />
                        <button
                          type="button"
                          className="iconBtn iconBtn-sm"
                          onClick={() => deleteAsset("titlesponsor")}
                          disabled={uploading}
                          aria-label="Delete title sponsor"
                        >
                          🗑
                        </button>
                      </div>
                    ) : (
                      <label className="fileBtn">
                        Upload Sponsor
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadAsset("titlesponsor", file);
                            e.currentTarget.value = "";
                          }}
                          disabled={!editingId || uploading}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="actions">
          <button className="btn primary" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : isEditing ? "Save changes" : "Create course"}
          </button>
          {isEditing && isGlobal && (
            <button className="btn" onClick={resetForm} disabled={busy}>
              New course
            </button>
          )}
          {success && <div className="toast success">{success}</div>}
        </div>

        {isGlobal ? (
          <section className="card">
            <div className="filterRow">
              <div className="filterTitle">Courses</div>
              <div className="filterToggle">
                <button
                  type="button"
                  className={`btn small ${statusFilter === "active" ? "primary" : ""}`}
                  onClick={() => setStatusFilter("active")}
                >
                  Active
                </button>
                <button
                  type="button"
                  className={`btn small ${statusFilter === "inactive" ? "primary" : ""}`}
                  onClick={() => setStatusFilter("inactive")}
                >
                  Inactive
                </button>
              </div>
            </div>
            {loading ? (
              <div className="muted">Loading…</div>
            ) : (
              <div className="table">
                <div className="tableHead">
                  <span>ID</span>
                  <span>Name</span>
                </div>
                {visibleCourses.map((c) => (
                  <div
                    key={c.course_id}
                    className="tableRow clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => beginEdit(c)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        beginEdit(c);
                      }
                    }}
                  >
                    <span className="courseIdCell">{c.course_id ?? ""}</span>
                    <span className="courseName">
                      <span>{c.coursename ?? "—"}</span>
                      <span className="editIconBtn inline" aria-hidden="true">
                        ✎
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>

      <style>{`
        .page { display: grid; gap: 14px; }
        .grid { display: grid; gap: 14px; grid-template-columns: 1fr; }
        .split {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        h2 { margin: 0; font-size: 15px; text-align: center; }
        .sectionTitle { color: #6b7280; }
        .form { display: grid; gap: 10px; }
        .assetSection { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
        .assetBlock { display: grid; gap: 6px; }
        .logoRow {
          display: grid;
          gap: 12px;
          grid-template-columns: minmax(220px, 1fr) minmax(120px, 180px);
          align-items: end;
        }
        .logoRow .formLabel { min-width: 0; }
        .logoRow .formLabel input { width: 100%; max-width: 100%; }
        .compactAsset { align-content: start; }
        .assetTitle { font-size: 12px; font-weight: 600; color: #6b7280; }
        label { display: grid; gap: 4px; font-weight: 600; font-size: 12px; }
        .formLabel { color: #6b7280; }
        input { padding: 8px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 13px; }
        .inputNormal { font-size: 13px; }
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
          min-width: 140px;
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
        .iconBtn-sm {
          width: 20px;
          height: 20px;
          font-size: 11px;
        }
        .iconBtn:disabled { opacity: 0.6; cursor: not-allowed; }
        .wysiwyg {
          min-height: 160px;
          max-height: 240px;
          overflow: auto;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          font-size: 13px;
          color: #111827;
          background: #fff;
          line-height: 1.6;
        }
        .wysiwyg:focus { outline: 2px solid #c7d2fe; outline-offset: 2px; }
        .row { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
        .checkbox { display: flex; align-items: center; gap: 8px; font-weight: 600; }
        .checkbox input { width: 16px; height: 16px; padding: 0; }
        .checkboxLabel { font-size: 12px; color: #374151; }
        .actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .btn { border: 1px solid #d1d5db; background: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; }
        .btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .btn.small { padding: 5px 8px; font-size: 11px; }
        .alert { padding: 10px 12px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; color: #991b1b; }
        .alert.success { border-color: #bbf7d0; background: #ecfdf3; color: #166534; }
        .toast { padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
        .toast.success { border: 1px solid #bbf7d0; background: #ecfdf3; color: #166534; }
        .muted { color: #6b7280; font-size: 12px; }
        .filterRow { display: grid; gap: 6px; justify-items: center; margin: 0 0 6px; }
        .filterTitle { font-size: 15px; color: #6b7280; font-weight: 600; }
        .filterToggle { display: inline-flex; gap: 6px; }
        .table { display: grid; gap: 8px; margin-top: 20px; }
        .tableHead, .tableRow { display: grid; gap: 8px; grid-template-columns: 72px 1fr; align-items: center; }
        .tableHead { font-weight: 600; font-size: 12px; color: #6b7280; }
        .tableRow { padding: 6px 0; border-top: 1px solid #f3f4f6; font-size: 12px; }
        .courseIdCell { font-size: 11px; color: #6b7280; }
        .tableRow.clickable { cursor: pointer; }
        .tableRow.clickable:hover { background: #f7f8fb; }
        .tableRow.clickable:focus { outline: 2px solid #93c5fd; outline-offset: 2px; }
        .courseName { display: inline-flex; align-items: center; gap: 8px; justify-content: space-between; width: 100%; }
        .editIconBtn {
          border: 1px solid #d1d5db;
          background: #fff;
          width: 26px;
          height: 26px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .editIconBtn.inline { width: 22px; height: 22px; border-radius: 6px; }
        .editIconBtn:hover { background: #f7f8fb; }
      `}</style>
    </div>
  );
}
