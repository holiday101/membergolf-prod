import { useState } from "react";
import { Link } from "react-router-dom";

export default function MarketingPage() {
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [showLead, setShowLead] = useState(false);

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/public/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          course: course.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSent(true);
    } catch (e: any) {
      setError(e.message ?? "Failed to send");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="marketing">
      <header className="hero">
        <div className="heroTop">
          <div className="brandBubble">
            <div className="brand">
              <svg viewBox="0 0 120 120" aria-hidden="true" className="brandMark">
                <defs>
                  <linearGradient id="mgo-gradient-landing" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#0b3d2e" />
                    <stop offset="100%" stopColor="#1f8a5b" />
                  </linearGradient>
                </defs>
                <path
                  d="M60 10c22 0 40 8 40 24v28c0 26-19 44-40 48-21-4-40-22-40-48V34c0-16 18-24 40-24Z"
                  fill="url(#mgo-gradient-landing)"
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
              <div className="brandText fontCormorant">Member Golf Online</div>
            </div>
          </div>
          <Link className="loginBtn" to="/login">
            Course Login
          </Link>
        </div>
        <div className="heroBody">
          <div className="heroCopy">
            <h1>Run your golf league in one place.</h1>
            <p>Events, handicaps, payouts, and members—organized and up to date.</p>
            <div className="heroActions">
              <Link className="primaryBtn" to="/login">
                Course Login
              </Link>
              <a className="secondaryBtn" href="#benefits">
                Learn More
              </a>
            </div>
          </div>
          <div className="heroArt" aria-hidden="true">
            <div className="scoreboardWrap">
            <svg viewBox="0 0 420 300" className="scoreboard" role="img">
              <rect x="0" y="0" width="420" height="300" fill="#dff1f7" />
              <path d="M0 230 Q120 190 240 220 T420 230 L420 300 L0 300 Z" fill="#9cc27c" />
              <path d="M0 250 Q140 210 260 245 T420 255 L420 300 L0 300 Z" fill="#7ea865" />
              <g fill="#6aa36f">
                <circle cx="40" cy="170" r="24" />
                <circle cx="62" cy="178" r="18" />
                <circle cx="30" cy="182" r="16" />
              </g>
              <g fill="#5a8f5f">
                <circle cx="360" cy="165" r="26" />
                <circle cx="384" cy="176" r="18" />
                <circle cx="340" cy="180" r="16" />
              </g>
              <rect x="32" y="190" width="8" height="26" fill="#4c6b41" />
              <rect x="360" y="190" width="8" height="28" fill="#4c6b41" />
              <rect x="70" y="40" width="280" height="140" rx="10" fill="#355e3b" />
              <rect x="86" y="55" width="248" height="110" rx="6" fill="#e7f2e3" stroke="#7aa36f" strokeWidth="3" />
              <rect x="86" y="55" width="248" height="42" rx="6" fill="#cfe3c6" />
              <text x="210" y="72" textAnchor="middle" fontSize="12" fontWeight="700" fill="#2f4f2f">
                Member Golf Wednesday Night Mens
              </text>
              <text x="210" y="88" textAnchor="middle" fontSize="11" fontWeight="700" fill="#2f4f2f">
                MONEY LIST
              </text>
              <g fontSize="12" fill="#2f4f2f" fontWeight="600">
                <text x="110" y="121">Earl “Dusty” Baker</text>
                <text x="320" y="121" textAnchor="end">$1,572.19</text>
                <text x="110" y="138">Bubba Ray Simmons</text>
                <text x="320" y="138" textAnchor="end">$420.00</text>
                <text x="110" y="155">Cletus “Ace” Miller</text>
                <text x="320" y="155" textAnchor="end">$20.00</text>
              </g>
              <rect x="190" y="180" width="40" height="80" rx="6" fill="#2f4f2f" />
              <rect x="160" y="250" width="100" height="18" rx="9" fill="#2f4f2f" />
              <rect x="140" y="265" width="140" height="10" rx="5" fill="#1f3b1f" />
            </svg>
            </div>
          </div>
        </div>
      </header>
      <section id="benefits" className="benefits">
        <div className="benefit">
          <h3>Grow weekly participation</h3>
          <p>Make it easier for members to show up and play each week.</p>
        </div>
        <div className="benefit">
          <h3>Fast, simple workflows</h3>
          <p>Post scores, calculate payouts, and keep standings updated automatically.</p>
        </div>
        <div className="benefit">
          <h3>Built for mobile</h3>
          <p>Members can view schedules and results from any device.</p>
        </div>
      </section>
      <section className="cta" id="info">
        <div>
          <h2>Do you want more information?</h2>
          <p>We can walk you through setup for your course.</p>
        </div>
        <button className="primaryBtn" onClick={() => setShowLead(true)}>
          Request Info
        </button>
      </section>

      {showLead ? (
        <div className="modalOverlay" onClick={() => setShowLead(false)}>
          <div
            className="modal"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="modalHeader">
              <h3>Request Information</h3>
              <button className="closeBtn" onClick={() => setShowLead(false)}>
                ×
              </button>
            </div>
            <form className="leadForm" onSubmit={submitLead}>
              <input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input
                placeholder="Course name"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <button className="primaryBtn" type="submit" disabled={submitting}>
                {submitting ? "Sending…" : "Send Request"}
              </button>
              {sent ? <div className="success">Thanks! We’ll be in touch.</div> : null}
              {error ? <div className="error">{error}</div> : null}
            </form>
          </div>
        </div>
      ) : null}

      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Cinzel:wght@600;700&family=Cormorant+Garamond:wght@600;700&family=Playfair+Display:wght@600;700&family=IM+Fell+English:ital@0;1&display=swap");
        .marketing {
          min-height: 100vh;
          background: radial-gradient(800px 400px at 20% 0%, #e0f2fe, transparent 60%), #f8fafc;
          color: #0f172a;
          font-family: "Manrope", system-ui, -apple-system, "Segoe UI", sans-serif;
        }
        .hero { padding: 28px 24px 40px; max-width: 980px; margin: 0 auto; }
        .heroTop { display: flex; align-items: center; justify-content: space-between; }
        .brandBubble {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 12px 22px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid #dbe7d7;
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.12);
        }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brandMark { width: 42px; height: 42px; }
        .brandText {
          font-weight: 800;
          letter-spacing: 0;
          font-size: 22px;
          line-height: 1.1;
          color: #1f8a5b;
          font-family: "Cormorant Garamond", "Manrope", system-ui, sans-serif;
        }
        .fontCormorant { font-family: "Cormorant Garamond", "Manrope", system-ui, sans-serif; }
        .loginBtn { text-decoration: none; font-weight: 600; color: #0f172a; border: 1px solid #dbe7d7; padding: 8px 14px; border-radius: 999px; background: #f7fbf6; transition: all 160ms ease; }
        .loginBtn:hover { background: #ecf5ea; border-color: #c6dcc0; }
        .heroBody { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 24px; margin-top: 28px; align-items: center; }
        .heroCopy h1 { font-size: 34px; line-height: 1.1; margin: 0 0 10px; color: #1f8a5b; }
        .heroCopy p { font-size: 16px; color: #475569; margin: 0 0 16px; }
        .heroActions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .primaryBtn {
          text-decoration: none;
          background: #1f8a5b;
          color: #fff;
          padding: 10px 18px;
          border-radius: 999px;
          font-weight: 600;
          display: inline-block;
          border: 1px solid #176f49;
          box-shadow: 0 6px 16px rgba(31, 138, 91, 0.2);
          transition: all 160ms ease;
          font-size: 13px;
        }
        .primaryBtn:hover { background: #1a7a50; transform: translateY(-1px); box-shadow: 0 10px 22px rgba(31, 138, 91, 0.25); }
        .secondaryBtn {
          text-decoration: none;
          color: #14532d;
          border: 1px solid #cfe3c6;
          padding: 10px 18px;
          border-radius: 999px;
          font-weight: 600;
          background: #edf7ea;
          transition: all 160ms ease;
          font-size: 13px;
        }
        .secondaryBtn:hover { background: #e2f1dd; border-color: #b8d3b0; }
        .heroArt { display: flex; justify-content: center; }
        .scoreboardWrap {
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
          border: 1px solid #dbe7d7;
          background: #ffffff;
        }
        .scoreboard { width: 100%; max-width: 360px; height: auto; display: block; }
        .benefits { max-width: 980px; margin: 0 auto; padding: 10px 24px 30px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .benefit { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
        .benefit h3 { margin: 0 0 6px; font-size: 14px; }
        .benefit p { margin: 0; font-size: 13px; color: #64748b; }
        .cta { max-width: 980px; margin: 0 auto 40px; padding: 18px 24px; border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .cta h2 { margin: 0 0 6px; font-size: 16px; }
        .cta p { margin: 0; color: #64748b; font-size: 13px; }
        .modalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.5);
          display: grid;
          place-items: center;
          z-index: 50;
        }
        .modal {
          width: min(440px, 92vw);
          background: #fff;
          border-radius: 14px;
          padding: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.2);
        }
        .modalHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .modalHeader h3 { margin: 0; font-size: 16px; }
        .closeBtn {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          font-size: 18px;
          cursor: pointer;
          transition: all 160ms ease;
        }
        .closeBtn:hover { background: #eef2f7; }
        .leadForm { display: grid; gap: 8px; }
        .leadForm input {
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          font-size: 13px;
        }
        .leadForm .primaryBtn { width: fit-content; }
        .success { color: #15803d; font-size: 12px; }
        .error { color: #b91c1c; font-size: 12px; }
        @media (max-width: 900px) {
          .heroBody { grid-template-columns: 1fr; }
          .benefits { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .heroCopy h1 { font-size: 28px; }
          .cta { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
