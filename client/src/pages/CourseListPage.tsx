import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../auth";

type Course = {
  course_id: number;
  coursename: string | null;
  active_yn: number | null;
};

export default function CourseListPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [toast, setToast] = useState<string>("");
  const [isGlobal, setIsGlobal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive">("active");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const run = async () => {
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

        const globalUser = !me?.user?.courseId;
        setIsGlobal(globalUser);
        const myCourseId = me?.user?.courseId ? Number(me.user.courseId) : null;

        const res = await apiFetch("/courses/manage");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setCourses(data);

        if (!globalUser) {
          const targetId =
            (Number.isFinite(myCourseId) ? myCourseId : null) ??
            (data.length === 1 ? Number(data[0]?.course_id) : null);
          if (targetId) {
            navigate(`/courses/${targetId}/edit`, { replace: true });
            return;
          }
        }
      } catch (err: any) {
        setError(String(err?.message || "Failed to load courses"));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [navigate]);

  useEffect(() => {
    const flash = (location.state as any)?.toast;
    if (!flash) return;
    setToast(String(flash));
    const t = window.setTimeout(() => setToast(""), 1800);
    navigate(location.pathname, { replace: true, state: null });
    return () => window.clearTimeout(t);
  }, [location.pathname, location.state, navigate]);

  const sortedCourses = useMemo(
    () =>
      [...courses].sort((a, b) => {
        const aActive = a.active_yn ?? 0;
        const bActive = b.active_yn ?? 0;
        if (aActive !== bActive) return bActive - aActive;
        const aName = (a.coursename ?? "").toLowerCase();
        const bName = (b.coursename ?? "").toLowerCase();
        return aName.localeCompare(bName);
      }),
    [courses]
  );

  const visibleCourses = sortedCourses.filter((course) =>
    statusFilter === "active" ? (course.active_yn ?? 0) === 1 : (course.active_yn ?? 0) === 0
  );

  return (
    <div className="page">
      {error && (
        <div className="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <section className="card">
        <div className="headerRow">
          <div className="filterTitle">Courses</div>
          {isGlobal ? (
            <Link className="btn primary" to="/courses/new">
              New Course
            </Link>
          ) : null}
        </div>

        {isGlobal ? (
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
        ) : null}
        {toast ? <div className="toast success">{toast}</div> : null}

        {loading ? (
          <div className="muted">Loading…</div>
        ) : visibleCourses.length === 0 ? (
          <div className="muted">No courses found.</div>
        ) : (
          <div className="table">
            <div className="tableHead">
              <span>ID</span>
              <span>Name</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            {visibleCourses.map((c) => (
              <div
                key={c.course_id}
                className="tableRow clickable"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/courses/${c.course_id}/edit`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/courses/${c.course_id}/edit`);
                  }
                }}
              >
                <span className="courseIdCell">{c.course_id}</span>
                <span>{c.coursename ?? "—"}</span>
                <span>{(c.active_yn ?? 0) === 1 ? "Active" : "Inactive"}</span>
                <span>
                  <Link
                    className="btn small"
                    to={`/courses/${c.course_id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Edit
                  </Link>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .page { display: grid; gap: 14px; }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        .headerRow { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
        .filterTitle { font-size: 15px; color: #6b7280; font-weight: 600; }
        .filterToggle { display: inline-flex; gap: 6px; margin-bottom: 12px; }
        .btn { border: 1px solid #d1d5db; background: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; text-decoration: none; color: #111827; display: inline-flex; align-items: center; transition: background 140ms ease, border-color 140ms ease, transform 140ms ease; }
        .btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .btn.small { padding: 5px 8px; font-size: 11px; }
        .btn:hover { background: #f8fafc; border-color: #cbd5e1; transform: translateY(-1px); }
        .btn.primary:hover { background: #1d4ed8; border-color: #1d4ed8; }
        .btn:active { transform: translateY(0); }
        .alert { padding: 10px 12px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; color: #991b1b; }
        .toast { padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; width: fit-content; margin-bottom: 8px; }
        .toast.success { border: 1px solid #bbf7d0; background: #ecfdf3; color: #166534; }
        .muted { color: #6b7280; font-size: 12px; }
        .table { display: grid; gap: 8px; }
        .tableHead, .tableRow { display: grid; gap: 8px; grid-template-columns: 72px 1fr 90px 80px; align-items: center; }
        .tableHead { font-weight: 600; font-size: 12px; color: #6b7280; }
        .tableRow { padding: 8px 0; border-top: 1px solid #f3f4f6; font-size: 12px; }
        .tableRow.clickable { cursor: pointer; }
        .tableRow.clickable:hover { background: #f8fafc; }
        .tableRow.clickable:focus { outline: 2px solid #93c5fd; outline-offset: 2px; border-radius: 8px; }
        .courseIdCell { font-size: 11px; color: #6b7280; }
      `}</style>
    </div>
  );
}
