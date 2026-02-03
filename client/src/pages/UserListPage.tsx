import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

type FormState = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  course_id: string;
  admin_yn: boolean;
};

const emptyForm: FormState = {
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  course_id: "",
  admin_yn: false,
};

export default function UserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [courseFilter, setCourseFilter] = useState<string>("global");
  const navigate = useNavigate();
  const [isGlobalUser, setIsGlobalUser] = useState(false);
  const [myCourseId, setMyCourseId] = useState<number | null>(null);

  const isEditing = editingId !== null;

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

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function beginEdit(user: User) {
    setEditingId(user.id);
    setForm({
      email: user.email,
      password: "",
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      course_id: user.course_id ? String(user.course_id) : "",
      admin_yn: (user.admin_yn ?? 0) === 1,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const payload: any = {
        email: form.email.trim(),
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        course_id: form.course_id ? Number(form.course_id) : null,
        admin_yn: form.admin_yn ? 1 : 0,
      };
      if (!isEditing || form.password.trim()) payload.password = form.password;

      const res = await apiFetch(isEditing ? `/users/${editingId}` : "/users", {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
      }

      await loadData();
      resetForm();
    } catch (err: any) {
      setError(String(err?.message || "Request failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      {error && (
        <div className="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid">
        <section className="card">
          <h2 className="sectionTitle">{isEditing ? "Edit user" : "Create user"}</h2>

          <div className="form">
            <label className="formLabel">
              Email
              <input
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="user@example.com"
              />
            </label>

            <label className="formLabel">
              Password {isEditing ? "(leave blank to keep)" : ""}
              <input
                type="password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                placeholder={isEditing ? "" : "Min 8 characters"}
              />
            </label>

            <div className="row">
              <label className="formLabel">
                First name
                <input
                  value={form.first_name}
                  onChange={(e) => setField("first_name", e.target.value)}
                />
              </label>

              <label className="formLabel">
                Last name
                <input
                  value={form.last_name}
                  onChange={(e) => setField("last_name", e.target.value)}
                />
              </label>
            </div>

            <label className="formLabel">
              Course
              <select
                value={form.course_id}
                onChange={(e) => setField("course_id", e.target.value)}
              >
                <option value="">None</option>
                {courseOptions.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="formLabel checkbox">
              <input
                type="checkbox"
                checked={form.admin_yn}
                onChange={(e) => setField("admin_yn", e.target.checked)}
              />
              Admin
            </label>

            <div className="actions">
              <button className="btn primary" onClick={submit} disabled={busy}>
                {busy ? "Saving…" : isEditing ? "Save changes" : "Create user"}
              </button>
              {isEditing && (
                <button className="btn" onClick={resetForm} disabled={busy}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="card">
          {isGlobalUser ? (
            <div className="filterRow">
              <div className="filterTitle">View Users By Course</div>
              <select
                className="filterSelect"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
              >
                <option value="global">Global users</option>
                {courseOptions.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="filterRow">
              <div className="filterTitle">Users</div>
            </div>
          )}
          {loading ? (
            <div className="muted">Loading…</div>
          ) : (
            <div className="table">
              <div className="tableHead">
                <span>Name</span>
                <span></span>
              </div>
              {filteredUsers.map((u) => (
                <div key={u.id} className="tableRow">
                  <span>
                    {(u.last_name || "").trim()}, {(u.first_name || "").trim()}
                  </span>
                  <button className="btn small" onClick={() => beginEdit(u)}>
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <style>{`
        .page { display: grid; gap: 14px; }
        .grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        h2 { margin: 0; font-size: 15px; text-align: center; }
        .sectionTitle { color: #6b7280; }
        .filterRow {
          display: grid;
          gap: 6px;
          justify-items: center;
          margin: 0 0 6px;
        }
        .filterTitle { font-size: 15px; color: #6b7280; font-weight: 600; }
        .filterSelect { padding: 6px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 12px; }
        .form { display: grid; gap: 10px; }
        label { display: grid; gap: 4px; font-weight: 600; font-size: 12px; }
        .formLabel { color: #6b7280; }
        input, select { padding: 8px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 13px; }
        .checkbox { display: flex; align-items: center; gap: 8px; font-weight: 600; }
        .checkbox input { width: 16px; height: 16px; padding: 0; }
        .row { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); }
        .actions { display: flex; gap: 8px; }
        .btn { border: 1px solid #d1d5db; background: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; }
        .btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .btn.small { padding: 5px 8px; font-size: 11px; }
        .alert { padding: 10px 12px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; color: #991b1b; }
        .muted { color: #6b7280; }
        .table { display: grid; gap: 8px; margin-top: 20px; }
        .tableHead, .tableRow { display: grid; gap: 8px; grid-template-columns: 2fr auto; align-items: center; }
        .tableHead { font-weight: 600; font-size: 12px; color: #6b7280; text-transform: none; letter-spacing: normal; }
        .tableRow { padding: 6px 0; border-top: 1px solid #f3f4f6; font-size: 12px; }
      `}</style>
    </div>
  );
}
