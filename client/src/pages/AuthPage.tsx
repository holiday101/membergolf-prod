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
      <main className="card">
        <div className="cardHeaderBubble">
          <svg viewBox="0 0 120 120" aria-hidden="true" className="brandMark">
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
          <div className="brandText">Member Golf Online</div>
          <div className="divider" />
          <div className="cardTitle">Course Login</div>
        </div>
        {loggedIn ? (
          <button className="softBtn" onClick={logout}>
            Log out
          </button>
        ) : null}
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

            <button className="primaryBtn" onClick={submit} disabled={busy}>
              {busy ? "Working…" : "Course Login"}
            </button>
          </div>
        )}

        {error && (
          <div className="alert" role="alert">
            <div className="alertTitle">Something went wrong</div>
            <pre className="alertBody">{error}</pre>
          </div>
        )}
      </main>

      {/* Styles (no libraries needed) */}
      <style>{`
  @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Cormorant+Garamond:wght@600;700&display=swap");
  * { box-sizing: border-box; }
  body { margin: 0; }

  .page {
    min-height: 100vh;
    background: #e8f3e3;
    color: #0f172a;
    display: grid;
    place-items: center;
    padding: 32px 16px;
    font-family: "Manrope", system-ui, -apple-system, "Segoe UI", sans-serif;
    gap: 8px;
  }

  .cardHeaderBubble {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border-radius: 14px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
    margin: 0 auto 16px;
  }
  .brandMark { width: 36px; height: 36px; }
  .brandText {
    font-weight: 800;
    letter-spacing: 0.02em;
    font-size: 20px;
    line-height: 1.1;
    font-family: "Cormorant Garamond", "Manrope", system-ui, sans-serif;
    color: #1f8a5b;
  }
  .divider {
    width: 1px;
    height: 22px;
    background: #dbe7d7;
  }

  .softBtn {
    border: 1px solid #dbe7d7;
    background: #f7fbf6;
    padding: 8px 14px;
    border-radius: 999px;
    font-weight: 600;
    cursor: pointer;
  }

  .card {
    width: 100%;
    max-width: 520px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  }

  .cardTitle {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    text-align: center;
    white-space: nowrap;
  }

  .form {
    align-items: center;
  }

  .label, .input {
    width: 100%;
  }

  .primaryBtn {
    align-self: center;
  }

  .form {
    display: grid;
    gap: 12px;
  }

  .label {
    font-size: 13px;
    color: #64748b;
    display: grid;
    gap: 4px;
  }

  .input {
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    font-size: 14px;
  }

  .input:focus {
    outline: none;
    border-color: #1f8a5b;
  }

  .primaryBtn {
    text-decoration: none;
    background: #1f8a5b;
    color: #fff;
    padding: 10px 18px;
    border-radius: 999px;
    font-weight: 600;
    border: 1px solid #176f49;
    box-shadow: 0 6px 16px rgba(31, 138, 91, 0.2);
    transition: all 160ms ease;
    cursor: pointer;
    font-size: 13px;
  }
  .primaryBtn:hover { background: #1a7a50; transform: translateY(-1px); }

  .alert {
    margin-top: 12px;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #b91c1c;
    font-size: 13px;
  }
`}</style>

    </div>
  );
}
