import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../auth";

type Course = {
  course_id: number;
  coursename: string | null;
  active_yn: number | null;
};

export default function SponsorsListPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
        const myCourseId = me?.user?.courseId ? Number(me.user.courseId) : null;

        const res = await apiFetch("/courses/manage");
        if (!res.ok) throw new Error(await res.text());
        const data: Course[] = await res.json();

        if (!globalUser) {
          const targetId =
            (Number.isFinite(myCourseId) ? myCourseId : null) ??
            (data.length === 1 ? Number(data[0]?.course_id) : null);
          if (targetId) {
            navigate(`/courses/${targetId}/sponsors`, { replace: true });
            return;
          }
        }

        setCourses(data);
      } catch (err: any) {
        setError(String(err?.message || "Failed to load courses"));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [navigate]);

  const sortedCourses = [...courses].sort((a, b) => {
    const aActive = a.active_yn ?? 0;
    const bActive = b.active_yn ?? 0;
    if (aActive !== bActive) return bActive - aActive;
    return (a.coursename ?? "").toLowerCase().localeCompare((b.coursename ?? "").toLowerCase());
  });

  return (
    <div className="page">
      {error && (
        <div className="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <section className="card">
        <div className="headerRow">
          <div className="filterTitle">Sponsors — Select a Course</div>
        </div>

        {loading ? (
          <div className="muted">Loading…</div>
        ) : sortedCourses.length === 0 ? (
          <div className="muted">No courses found.</div>
        ) : (
          <div className="table">
            <div className="tableHead">
              <span>ID</span>
              <span>Name</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            {sortedCourses.map((c) => (
              <div
                key={c.course_id}
                className="tableRow clickable"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/courses/${c.course_id}/sponsors`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/courses/${c.course_id}/sponsors`);
                  }
                }}
              >
                <span className="courseIdCell">{c.course_id}</span>
                <span>{c.coursename ?? "—"}</span>
                <span>{(c.active_yn ?? 0) === 1 ? "Active" : "Inactive"}</span>
                <span>Manage</span>
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
        .alert { padding: 10px 12px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; color: #991b1b; }
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
