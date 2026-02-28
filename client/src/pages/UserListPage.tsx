import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../auth";

type User = {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  course_id: number | null;
  coursename?: string | null;
  admin_yn?: number | null;
  created_at: string;
};

type Course = {
  course_id: number;
  coursename: string;
};

export default function UserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [toast, setToast] = useState<string>("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const navigate = useNavigate();
  const location = useLocation();
  const [isGlobalUser, setIsGlobalUser] = useState(false);
  const [myCourseId, setMyCourseId] = useState<number | null>(null);

  const courseOptions = useMemo(() => {
    return courses.map((c) => ({ value: String(c.course_id), label: c.coursename }));
  }, [courses]);

  const filteredUsers = useMemo(() => {
    const sorted = [...users].sort((a, b) => {
      const la = (a.last_name ?? "").toLowerCase();
      const lb = (b.last_name ?? "").toLowerCase();
      if (la !== lb) return la.localeCompare(lb);
      const fa = (a.first_name ?? "").toLowerCase();
      const fb = (b.first_name ?? "").toLowerCase();
      return fa.localeCompare(fb);
    });

    if (!isGlobalUser && myCourseId != null) {
      return sorted.filter((u) => u.course_id === myCourseId);
    }

    if (courseFilter === "global") {
      return sorted.filter((u) => u.course_id == null);
    }
    if (courseFilter === "all") return sorted;

    const id = Number(courseFilter);
    if (!Number.isFinite(id)) return sorted;
    return sorted.filter((u) => u.course_id === id);
  }, [users, courseFilter, isGlobalUser, myCourseId]);

  async function loadData() {
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
      const global = me?.user?.globalYn === 1;
      setIsGlobalUser(global);
      const cid = me?.user?.courseId ?? null;
      setMyCourseId(cid);
      if (!global && cid != null) {
        setCourseFilter(String(cid));
      }

      const [usersRes, coursesRes] = await Promise.all([apiFetch("/users"), apiFetch("/courses")]);
      if (!usersRes.ok) throw new Error(await usersRes.text());
      if (!coursesRes.ok) throw new Error(await coursesRes.text());

      const [usersJson, coursesJson] = await Promise.all([usersRes.json(), coursesRes.json()]);
      setUsers(usersJson);
      setCourses(coursesJson);
    } catch (err: any) {
      setError(String(err?.message || "Failed to load users"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [navigate]);

  useEffect(() => {
    const state = (location.state as any) || null;
    if (!state) return;
    if (state.toast) setToast(String(state.toast));
    if (state.courseFilter) setCourseFilter(String(state.courseFilter));
    const t = window.setTimeout(() => setToast(""), 2200);
    navigate(location.pathname, { replace: true, state: null });
    return () => window.clearTimeout(t);
  }, [location.pathname, location.state, navigate]);

  return (
    <div className="page">
      {error && (
        <div className="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <section className="card">
        <div className="headerRow">
          <div className="filterTitle">Users</div>
          <Link className="btn primary" to="/users/new">
            New User
          </Link>
        </div>

        {isGlobalUser ? (
          <div className="filterRow">
            <div className="filterTitle">View Users By Course</div>
            <select
              className="filterSelect"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
            >
              <option value="all">All users</option>
              <option value="global">Global users</option>
              {courseOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {toast ? <div className="toast success">{toast}</div> : null}

        {loading ? (
          <div className="muted">Loading…</div>
        ) : filteredUsers.length === 0 ? (
          <div className="muted">No users found.</div>
        ) : (
          <div className="table">
            <div className="tableHead">
              <span>Name</span>
              <span>Email</span>
              <span>Course</span>
              <span>Action</span>
            </div>
            {filteredUsers.map((u) => (
              <div key={u.id} className="tableRow">
                <span>{(u.last_name || "").trim()}, {(u.first_name || "").trim()}</span>
                <span>{u.email}</span>
                <span>{u.coursename || (u.course_id ? `Course #${u.course_id}` : "Global")}</span>
                <span>
                  <Link className="btn small" to={`/users/${u.id}/edit`}>
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
        .filterRow { display: grid; gap: 6px; margin-bottom: 10px; }
        .filterTitle { font-size: 15px; color: #6b7280; font-weight: 600; }
        .filterSelect { padding: 6px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 12px; max-width: 320px; }
        .btn { border: 1px solid #d1d5db; background: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; text-decoration: none; color: #111827; display: inline-flex; align-items: center; transition: background 140ms ease, border-color 140ms ease, transform 140ms ease; }
        .btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .btn.small { padding: 5px 8px; font-size: 11px; }
        .btn:hover { background: #f8fafc; border-color: #cbd5e1; transform: translateY(-1px); }
        .btn.primary:hover { background: #1d4ed8; border-color: #1d4ed8; }
        .btn:active { transform: translateY(0); }
        .toast { padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; width: fit-content; margin-bottom: 8px; }
        .toast.success { border: 1px solid #bbf7d0; background: #ecfdf3; color: #166534; }
        .alert { padding: 10px 12px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; color: #991b1b; }
        .muted { color: #6b7280; }
        .table { display: grid; gap: 8px; margin-top: 10px; }
        .tableHead, .tableRow { display: grid; gap: 8px; grid-template-columns: minmax(150px, 1fr) minmax(180px, 1.1fr) minmax(120px, 1fr) 70px; align-items: center; }
        .tableHead { font-weight: 600; font-size: 12px; color: #6b7280; }
        .tableRow { padding: 6px 0; border-top: 1px solid #f3f4f6; font-size: 12px; }
      `}</style>
    </div>
  );
}
