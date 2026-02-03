import { useEffect, useState } from "react";
import { apiFetch, clearToken, getToken, setToken } from "../auth";
import { useNavigate } from "react-router-dom";

type Me = { user: { userId: number; email: string } };

export default function App() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function loadMe() {
    setError("");
    const res = await apiFetch("/me");
    if (!res.ok) {
      setMe(null);
      return;
    }
    setMe(await res.json());
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      if (!res.ok) {
        setError(text || `Request failed (${res.status})`);
        return;
      }

      const data = text ? JSON.parse(text) : null;
      setToken(data.token);

      await loadMe();
      navigate("/calendar", { replace: true }); // ✅
    } finally {
      setBusy(false);
    }
  }
  
  function logout() {
    clearToken();
    setMe(null);
    setPassword("");
  }

  useEffect(() => {
    if (getToken()) loadMe();
  }, []);

  const loggedIn = !!me;
  useEffect(() => {
    if (loggedIn) navigate("/calendar", { replace: true });
  }, [loggedIn, navigate]);

  return (
    <div className="page">
      <div className="shell">
        <header className="header">
          <div>
            <div className="logo">
              <svg viewBox="0 0 120 120" aria-hidden="true" className="logoMark">
                <defs>
                  <linearGradient id="mgo-gradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#0b3d2e" />
                    <stop offset="100%" stopColor="#1f8a5b" />
                  </linearGradient>
                </defs>
                <path
                  d="M60 10c22 0 40 8 40 24v28c0 26-19 44-40 48-21-4-40-22-40-48V34c0-16 18-24 40-24Z"
                  fill="url(#mgo-gradient)"
                />
                <path
                  d="M60 18c-18 0-32 6-32 18v26c0 22 16 37 32 40 16-3 32-18 32-40V36c0-12-14-18-32-18Z"
                  fill="#f8fafc"
                />
                <path d="M46 72c8 6 20 6 28 0" stroke="#14532d" strokeWidth="4" strokeLinecap="round" />
                <circle cx="60" cy="76" r="3.5" fill="#0f172a" />
                <line x1="60" y1="32" x2="60" y2="68" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                <path d="M60 34 L84 40 L60 48 Z" fill="#dc2626" />
                <path d="M40 88c6 8 14 12 20 12s14-4 20-12" stroke="#16a34a" strokeWidth="5" strokeLinecap="round" />
              </svg>
              <div>
                <h1 className="title">Member Golf Online</h1>
              </div>
            </div>
          </div>

          {loggedIn ? (
            <div className="userpill">
              <span className="dot" aria-hidden="true" />
              <span className="usertext">{me?.user.email}</span>
              <button className="btn btn-ghost" onClick={logout}>
                Log out
              </button>
            </div>
          ) : null}
        </header>

        <main className="grid">
          <section className="card">

            {!loggedIn && (
              <div className="form">
                <label className="label">
                  Email
                  <input
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </label>

                <label className="label">
                  Password
                  <input
                    className="input"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    autoComplete="current-password"
                  />
                </label>

                <button className="btn btn-primary" onClick={submit} disabled={busy}>
                  {busy ? "Working…" : "Login"}
                </button>
              </div>
            )}

            {error && (
              <div className="alert" role="alert">
                <div className="alertTitle">Something went wrong</div>
                <pre className="alertBody">{error}</pre>
              </div>
            )}
          </section>
        </main>

        <footer className="footer">
          <span>Run your league on the most trusted golf management platform.</span>
        </footer>
      </div>

      {/* Styles (no libraries needed) */}
      <style>{`
  :root {
    --bg: #f5f6f8;
    --card: #ffffff;
    --border: #e5e7eb;
    --text: #111827;
    --muted: #6b7280;
    --primary: #2563eb;
    --primary-soft: #e0e7ff;
    --danger: #dc2626;
    --radius: 12px;
  }

  * { box-sizing: border-box; }
  body { margin: 0; }

  .page {
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 32px 16px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial;
  }

  .shell {
    width: 100%;
    max-width: 520px;
  }

  .header {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 8px;
    margin-bottom: 20px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logoMark {
    width: 54px;
    height: 54px;
    flex: 0 0 54px;
  }

  .title {
    margin: 0;
    font-size: 24px;
    line-height: 1;
  }

  .subtitle {
    margin-top: 4px;
    font-size: 14px;
    color: var(--muted);
  }

  .tabs {
    display: flex;
    gap: 4px;
  }

  .tab {
    padding: 8px 14px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: white;
    cursor: pointer;
    font-weight: 600;
    color: var(--muted);
  }

  .tab-active {
    background: var(--primary-soft);
    color: var(--primary);
    border-color: var(--primary);
  }

  .userpill {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: white;
  }

  .grid {
    display: grid;
    gap: 20px;
  }

  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
  }

  .cardTitle {
    margin: 0;
    font-size: 18px;
  }

  .cardSubtitle {
    margin: 8px 0 16px;
    font-size: 14px;
    color: var(--muted);
  }

  .form {
    display: grid;
    gap: 12px;
  }

  .label {
    font-size: 13px;
    color: var(--muted);
    display: grid;
    gap: 4px;
  }

  .input {
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    font-size: 14px;
  }

  .input:focus {
    outline: none;
    border-color: var(--primary);
  }

  .btn {
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: white;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-primary {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }

  .btn-secondary {
    background: #f9fafb;
  }

  .btn-ghost {
    background: none;
    border: none;
    color: var(--muted);
  }

  .row {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .box {
    margin-top: 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }

  .boxTitle {
    padding: 8px 12px;
    font-size: 12px;
    color: var(--muted);
    border-bottom: 1px solid var(--border);
    background: #fafafa;
  }

  .code {
    margin: 0;
    padding: 12px;
    font-size: 12px;
    background: #fafafa;
  }

  .alert {
    margin-top: 12px;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: var(--danger);
    font-size: 13px;
  }

  .footer {
    margin-top: 20px;
    text-align: center;
    font-size: 12px;
    color: var(--muted);
  }
`}</style>

    </div>
  );
}
