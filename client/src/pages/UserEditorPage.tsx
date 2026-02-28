import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  scope: "global" | "course";
  course_id: string;
  admin_yn: boolean;
};

const emptyForm: FormState = {
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  scope: "global",
  course_id: "",
  admin_yn: true,
};

export default function UserEditorPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const userIdNum = userId ? Number(userId) : null;
  const isCreate = !userId;

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const courseOptions = useMemo(() => {
    return courses.map((c) => ({ value: String(c.course_id), label: c.coursename }));
  }, [courses]);

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
      scope: user.course_id ? "course" : "global",
      course_id: user.course_id ? String(user.course_id) : "",
      admin_yn: (user.admin_yn ?? 0) === 1,
    });
  }

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

      const [usersRes, coursesRes] = await Promise.all([apiFetch("/users"), apiFetch("/courses")]);
      if (!usersRes.ok) throw new Error(await usersRes.text());
      if (!coursesRes.ok) throw new Error(await coursesRes.text());

      const [usersJson, coursesJson] = await Promise.all([usersRes.json(), coursesRes.json()]);
      setCourses(coursesJson);

      if (isCreate) {
        setEditingId(null);
        setForm(emptyForm);
        return;
      }

      if (!userIdNum || !Number.isFinite(userIdNum)) {
        setError("Invalid user id");
        return;
      }

      const match = usersJson.find((u: User) => u.id === userIdNum);
      if (!match) {
        setError("User not found");
        return;
      }
      beginEdit(match);
    } catch (err: any) {
      setError(String(err?.message || "Failed to load user"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [userId, navigate]);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const payload: any = {
        email: form.email.trim(),
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        course_id: form.scope === "course" && form.course_id ? Number(form.course_id) : null,
        admin_yn: form.admin_yn ? 1 : 0,
      };
      if (form.scope === "course" && !form.course_id) {
        throw new Error("Please select a course or switch to Global.");
      }
      if (isCreate || form.password.trim()) payload.password = form.password;

      const res = await apiFetch(isCreate ? "/users" : `/users/${editingId}`, {
        method: isCreate ? "POST" : "PUT",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
      }

      if (isCreate) {
        const createdEmail = payload.email;
        navigate("/users", {
          replace: true,
          state: {
            toast: `New user added: ${createdEmail}.`,
            courseFilter: payload.course_id ? String(payload.course_id) : "global",
          },
        });
        return;
      }

      await loadData();
    } catch (err: any) {
      setError(String(err?.message || "Request failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <Link className="backLink" to="/users">
        ← Back to Users
      </Link>

      {error && (
        <div className="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <section className="card">
        <h2 className="sectionTitle">{isCreate ? "Create user" : "Edit user"}</h2>

        {loading ? (
          <div className="muted">Loading…</div>
        ) : (
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
              Password {isCreate ? "" : "(leave blank to keep)"}
              <input
                type="password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                placeholder={isCreate ? "Min 8 characters" : ""}
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
              User Type
              <select
                value={form.scope}
                onChange={(e) => {
                  const nextScope = e.target.value as "global" | "course";
                  setField("scope", nextScope);
                  if (nextScope === "global") setField("course_id", "");
                }}
              >
                <option value="global">Global</option>
                <option value="course">Course</option>
              </select>
            </label>

            <label className="formLabel">
              Course
              <select
                value={form.course_id}
                onChange={(e) => setField("course_id", e.target.value)}
                disabled={form.scope !== "course"}
              >
                <option value="">{form.scope === "course" ? "Select course" : "Not required for Global"}</option>
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
                {busy ? "Saving…" : isCreate ? "Create user" : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </section>

      <style>{`
        .page { display: grid; gap: 14px; }
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
        h2 { margin: 0 0 10px; font-size: 15px; text-align: center; }
        .sectionTitle { color: #6b7280; }
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
        .alert { padding: 10px 12px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; color: #991b1b; }
        .muted { color: #6b7280; }
      `}</style>
    </div>
  );
}
