import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
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
  autoflight_yn: number | null;
  active_yn: number | null;
  logo: string | null;
  titlesponsor: string | null;
  logo_url?: string | null;
  titlesponsor_url?: string | null;
};

type NineRow = {
  nine_id: number;
  course_id: number;
  ninename: string | null;
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
  handicaphole1?: number | null;
  handicaphole2?: number | null;
  handicaphole3?: number | null;
  handicaphole4?: number | null;
  handicaphole5?: number | null;
  handicaphole6?: number | null;
  handicaphole7?: number | null;
  handicaphole8?: number | null;
  handicaphole9?: number | null;
  handicaphole10?: number | null;
  handicaphole11?: number | null;
  handicaphole12?: number | null;
  handicaphole13?: number | null;
  handicaphole14?: number | null;
  handicaphole15?: number | null;
  handicaphole16?: number | null;
  handicaphole17?: number | null;
  handicaphole18?: number | null;
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
  autoflight_yn: string;
  active_yn: string;
  logo: string;
  titlesponsor: string;
};

const emptyForm: FormState = {
  coursename: "",
  leagueinfo: "",
  website: "",
  titlesponsor_link: "",
  payout: "0.3",
  cardsused: "6",
  cardsmax: "12",
  handicap_yn: "",
  decimalhandicap_yn: "",
  autoflight_yn: "1",
  active_yn: "1",
  logo: "",
  titlesponsor: "",
};

export default function CourseEditorPage() {
  const { courseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const courseIdNum = courseId ? Number(courseId) : null;
  const isCreate = !courseId;

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isGlobal, setIsGlobal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [nines, setNines] = useState<NineRow[]>([]);

  const successTimer = useRef<number | null>(null);

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
      autoflight_yn: course.autoflight_yn != null ? String(course.autoflight_yn) : "1",
      active_yn: course.active_yn != null ? String(course.active_yn) : "1",
      logo: course.logo ?? "",
      titlesponsor: course.titlesponsor ?? "",
    });
  }

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const meRes = await apiFetch("/me");
      if (!meRes.ok) throw new Error(await meRes.text());
      const me = await meRes.json();
      const globalUser = !me?.user?.courseId;
      setIsGlobal(globalUser);

      if (!me?.user?.isAdmin) {
        navigate("/calendar", { replace: true });
        return;
      }

      if (isCreate && !globalUser) {
        navigate("/courses", { replace: true });
        return;
      }

      const res = await apiFetch("/courses/manage");
      if (!res.ok) throw new Error(await res.text());
      const data: Course[] = await res.json();
      setCourses(data);

      if (isCreate) {
        setEditingId(null);
        setForm(emptyForm);
        setNines([]);
        return;
      }

      if (!courseIdNum || !Number.isFinite(courseIdNum)) {
        setError("Invalid course id");
        return;
      }

      const match = data.find((c) => c.course_id === courseIdNum);
      if (!match) {
        setError("Course not found");
        return;
      }
      beginEdit(match);
      const ninesRes = await apiFetch(`/courses/manage/${match.course_id}/nines`);
      if (ninesRes.ok) {
        setNines(await ninesRes.json());
      } else {
        setNines([]);
      }
    } catch (err: any) {
      setError(String(err?.message || "Failed to load course"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [courseId, navigate]);


  useEffect(() => {
    return () => {
      if (successTimer.current) window.clearTimeout(successTimer.current);
    };
  }, []);

  useEffect(() => {
    const flash = (location.state as any)?.toast;
    if (!flash) return;
    if (successTimer.current) window.clearTimeout(successTimer.current);
    setSuccess(String(flash));
    successTimer.current = window.setTimeout(() => setSuccess(""), 1800);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

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
        autoflight_yn: form.autoflight_yn ? Number(form.autoflight_yn) : null,
        active_yn: form.active_yn ? Number(form.active_yn) : null,
        logo: form.logo || null,
        titlesponsor: form.titlesponsor || null,
      };

      if (isCreate) {
        const createdName = form.coursename.trim();
        const res = await apiFetch("/courses/manage", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const created = await res.json();
        const newId = Number(created?.id);
        if (Number.isFinite(newId)) {
          navigate(`/courses/${newId}/edit`, {
            replace: true,
            state: { toast: `New course added: ${createdName}.` },
          });
          return;
        }
        navigate("/courses", {
          replace: true,
          state: { toast: `New course added: ${createdName}.` },
        });
        return;
      }

      if (!editingId) throw new Error("No course selected");
      const res = await apiFetch(`/courses/manage/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
      }

      await loadData();
      if (successTimer.current) window.clearTimeout(successTimer.current);
      setSuccess("Changes saved.");
      successTimer.current = window.setTimeout(() => setSuccess(""), 1200);
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
      successTimer.current = window.setTimeout(() => setSuccess(""), 1200);
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
      successTimer.current = window.setTimeout(() => setSuccess(""), 1200);
    } catch (err: any) {
      setError(String(err?.message || "Delete failed"));
    } finally {
      setUploading(false);
    }
  }

  async function deleteCourse() {
    if (!editingId || isCreate) return;
    const courseName = form.coursename.trim() || `Course #${editingId}`;
    const ok = window.confirm(
      `Delete ${courseName}?\\n\\nThis action is permanent and cannot be undone.`
    );
    if (!ok) return;

    setDeleting(true);
    setError("");
    try {
      const res = await apiFetch(`/courses/manage/${editingId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      navigate("/courses", {
        replace: true,
        state: { toast: `Course deleted: ${courseName}.` },
      });
    } catch (err: any) {
      setError(String(err?.message || "Delete failed"));
    } finally {
      setDeleting(false);
    }
  }

  const activeCourse = courses.find((c) => c.course_id === editingId) || null;

  return (
    <div className="page">
      <div className="topRow">
        <Link className="backLink" to="/courses">
          ← Back to Courses
        </Link>
      </div>

      {error && (
        <div className="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? <div className="muted">Loading…</div> : null}

      {!loading ? (
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
                    className="wysiwyg"
                    contentEditable
                    suppressContentEditableWarning
                    role="textbox"
                    aria-multiline="true"
                    dangerouslySetInnerHTML={{ __html: form.leagueinfo || "" }}
                    onBlur={(e) =>
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
                      {activeCourse?.logo_url ? (
                        <div className="assetPreviewRow">
                          <img
                            src={activeCourse.logo_url || ""}
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
                <div className="settingsGrid">
                  <div className="settingsLeft">
                    <label className="formLabel">
                      Payout
                      <div className="payoutInline">
                        <input
                          className="inputNormal inputNum"
                          value={form.payout}
                          onChange={(e) => setField("payout", e.target.value)}
                        />
                        <span className="fieldHint">0.3 means 30% get paid.</span>
                      </div>
                    </label>

                    <label className="formLabel">
                      Cards Used
                      <input
                        className="inputNormal inputNum"
                        value={form.cardsused}
                        onChange={(e) => setField("cardsused", e.target.value)}
                      />
                    </label>

                    <label className="formLabel">
                      Cards Max
                      <input
                        className="inputNormal inputNum"
                        value={form.cardsmax}
                        onChange={(e) => setField("cardsmax", e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="settingsRight">
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
                        onChange={(e) =>
                          setField("decimalhandicap_yn", e.target.checked ? "1" : "0")
                        }
                      />
                      <span className="checkboxLabel">Decimal Handicap Y/N</span>
                    </label>

                    <label className="formLabel checkbox">
                      <input
                        type="checkbox"
                        checked={form.autoflight_yn === "1"}
                        onChange={(e) => setField("autoflight_yn", e.target.checked ? "1" : "0")}
                      />
                      <span className="checkboxLabel">Auto Flight Y/N</span>
                    </label>

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
                      {activeCourse?.titlesponsor_url ? (
                        <div className="assetPreviewRow">
                          <img
                            src={activeCourse.titlesponsor_url || ""}
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
            <div className="actionLeft">
              <button className="btn primary" onClick={submit} disabled={busy || deleting}>
                {busy ? "Saving…" : isCreate ? "Create course" : "Save changes"}
              </button>
              {success ? <div className="toast success">{success}</div> : null}
            </div>
            {!isCreate && isGlobal ? (
              <button
                type="button"
                className="iconDanger"
                onClick={deleteCourse}
                disabled={deleting || busy}
                aria-label="Delete course"
                title="Delete course"
              >
                {deleting ? "…" : "🗑"}
              </button>
            ) : null}
          </div>

          {!isCreate ? (
            <section className="card">
              <div className="ninesHeaderRow">
                <div className="ninesHeader">Course Layouts</div>
                {editingId ? (
                  <Link className="btn small primary" to={`/courses/${editingId}/nines/new`}>
                    Add Layout
                  </Link>
                ) : null}
              </div>
              {nines.length === 0 ? (
                <div className="muted">No layouts found for this course.</div>
              ) : (
                <div className="table">
                  <div className="tableHead">
                    <span>ID</span>
                    <span>Name</span>
                    <span># of Holes</span>
                    <span>Start</span>
                    <span>Action</span>
                  </div>
                  {nines.map((n) => {
                    const holeCount = n.numholes === 18 ? 18 : 9;
                    const holeLabels = Array.from({ length: holeCount }, (_, i) => i + 1);
                    return (
                      <div key={n.nine_id} className="nineBlock">
                        <div className="tableRow">
                          <span>{n.nine_id}</span>
                          <span>{n.ninename ?? "—"}</span>
                          <span>{n.numholes ?? "—"}</span>
                          <span>{n.startinghole ?? "—"}</span>
                          <span className="nineActions">
                            {editingId ? (
                              <Link
                                className="btn small"
                                to={`/courses/${editingId}/nines/${n.nine_id}/edit`}
                              >
                                Edit
                              </Link>
                            ) : null}
                          </span>
                        </div>
                        <div
                          className="holeStrip"
                          style={{ gridTemplateColumns: `70px repeat(${holeCount}, minmax(34px, 1fr))` }}
                        >
                          <div className="holeLegend">
                            <div className="holeNumberLabel">Metric</div>
                            <div className="holeLegendHdcp">HDCP</div>
                            <div className="holeLegendPar">PAR</div>
                          </div>
                          {holeLabels.map((h) => {
                            const par = (n as any)[`hole${h}`];
                            const hdcp = (n as any)[`handicaphole${h}`];
                            return (
                              <div key={`h-${n.nine_id}-${h}`} className="holeCell">
                                <div className="holeNumber">{h}</div>
                                <div className="holeNumberLabel">{`Hole ${h}`}</div>
                                <div className="holeHdcp">{hdcp ?? "—"}</div>
                                <div className="holePar">{par ?? "—"}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}
        </div>
      ) : null}

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
        .split {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        .form { display: grid; gap: 10px; }
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
        .fieldHint { font-size: 11px; font-weight: 500; color: #64748b; }
        .payoutInline { display: inline-flex; align-items: center; gap: 8px; width: fit-content; }
        .inputNum { width: 80px; min-width: 80px; text-align: right; }
        input, select { padding: 8px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 13px; }
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
        .settingsGrid {
          display: grid;
          gap: 12px 16px;
          grid-template-columns: minmax(240px, 1fr) minmax(210px, auto);
          align-items: start;
        }
        .settingsLeft { display: grid; gap: 10px; }
        .settingsRight { display: grid; gap: 10px; align-content: start; padding-top: 22px; }
        .checkbox { display: flex; align-items: center; gap: 8px; font-weight: 600; }
        .checkbox input { width: 16px; height: 16px; padding: 0; }
        .checkboxLabel { font-size: 12px; color: #374151; }
        @media (max-width: 780px) {
          .settingsGrid { grid-template-columns: 1fr; }
          .settingsRight { padding-top: 2px; }
        }
        .actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .actionLeft { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .btn { border: 1px solid #d1d5db; background: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; text-decoration: none; }
        .btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .iconDanger {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid #fecaca;
          background: #fff1f2;
          color: #b91c1c;
          cursor: pointer;
          font-size: 15px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background 140ms ease, border-color 140ms ease, transform 140ms ease;
        }
        .iconDanger:hover { background: #ffe4e6; border-color: #fda4af; transform: translateY(-1px); }
        .iconDanger:active { transform: translateY(0); }
        .iconDanger:disabled { opacity: 0.6; cursor: not-allowed; }
        .alert { padding: 10px 12px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; color: #991b1b; }
        .toast { padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
        .toast.success { border: 1px solid #bbf7d0; background: #ecfdf3; color: #166534; }
        .muted { color: #6b7280; font-size: 12px; }
        .ninesHeaderRow { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
        .ninesHeader { font-size: 14px; font-weight: 700; color: #374151; }
        .table { display: grid; gap: 8px; }
        .tableHead, .tableRow {
          display: grid;
          grid-template-columns: 60px 1fr 80px 80px 180px;
          gap: 8px;
          align-items: center;
        }
        .tableHead { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 700; }
        .tableRow { padding: 8px 0; border-top: 1px solid #f3f4f6; font-size: 12px; }
        .nineBlock { border-top: 1px solid #f3f4f6; padding-top: 6px; }
        .nineBlock .tableRow { border-top: 0; padding-top: 2px; }
        .nineActions { display: inline-flex; gap: 6px; align-items: center; }
        .holeStrip {
          margin: 6px 0 2px;
          display: grid;
          gap: 4px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .holeCell {
          border: 1px solid #dbeafe;
          border-radius: 8px;
          background: #f8fbff;
          text-align: center;
          padding: 4px 2px;
          min-width: 34px;
        }
        .holeLegend {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #f1f5f9;
          text-align: center;
          padding: 4px 2px;
          min-width: 70px;
        }
        .holeNumber { display: none; }
        .holeNumberLabel { font-size: 10px; color: #64748b; font-weight: 700; line-height: 1.1; }
        .holeLegendHdcp { font-size: 11px; color: #334155; font-weight: 800; line-height: 1.2; }
        .holeLegendPar { font-size: 12px; color: #0f172a; font-weight: 900; line-height: 1.2; }
        .holeHdcp { font-size: 11px; color: #334155; font-weight: 700; line-height: 1.2; }
        .holePar { font-size: 12px; color: #0f172a; font-weight: 800; line-height: 1.2; }
      `}</style>
    </div>
  );
}
