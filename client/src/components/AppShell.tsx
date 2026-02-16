import { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { apiFetch, clearToken, getToken } from "../auth";

type Me = {
  user: {
    userId: number;
    email: string;
    courseId?: number | null;
    isAdmin?: boolean;
    // If you later add these on the backend, it will “just work”
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
  };
};


function getFirstNameFromMe(me: Me | null): string | null {
  const u = me?.user;
  if (!u) return null;

  const direct = (u.firstName || u.name || "").trim();
  if (direct) return direct.split(" ")[0];

  // fallback: derive from email prefix like "jared.holland@" -> "Jared"
  if (u.email) {
    const prefix = u.email.split("@")[0] || "";
    const cleaned = prefix.split(/[._-]/)[0] || "";
    if (cleaned) return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return null;
}

export default function AppShell() {
  const token = getToken();
  const navigate = useNavigate();
  const location = useLocation();

  const desktopInit =
    typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches;
  const [drawerOpen, setDrawerOpen] = useState(desktopInit);
  const [isDesktop, setIsDesktop] = useState(desktopInit);
  const [userToggled, setUserToggled] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  const firstName = useMemo(() => getFirstNameFromMe(me), [me]);

  // Keep drawer state persistent across route changes

  // Default open on desktop, allow closing
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 900px)");
    const apply = () => {
      setIsDesktop(mq.matches);
      if (mq.matches) {
        setDrawerOpen((prev) => (userToggled ? prev : true));
      } else {
        setDrawerOpen(false);
      }
    };
    apply();
    if (mq.addEventListener) mq.addEventListener("change", apply);
    else mq.addListener(apply);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", apply);
      else mq.removeListener(apply);
    };
  }, [userToggled]);
  // Load /me for email/name display
  const eventMatch = location.pathname.match(/^\/events\/(\d+)/);
  const subeventMatch = location.pathname.match(/^\/subevents\/(\d+)/);
  const subeventCreateMatch = location.pathname.match(/^\/subevents\/new/);
  const eventQuery = useMemo(() => {
    if (!subeventCreateMatch) return null;
    const params = new URLSearchParams(location.search);
    const value = params.get("event");
    return value && value.trim() ? value : null;
  }, [location.search, subeventCreateMatch]);
  const eventId = eventMatch?.[1];
  const subeventId = subeventMatch?.[1];
  const [subEventEventId, setSubEventEventId] = useState<string | null>(null);
  const isEditEvent = Boolean(eventId || subEventEventId || eventQuery);
  const fromCalendar = Boolean((location as any)?.state?.fromCalendar);
  const isCalendarRoute = location.pathname === "/calendar";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("calendar-full", isCalendarRoute);
    return () => {
      document.body.classList.remove("calendar-full");
    };
  }, [isCalendarRoute]);

  useEffect(() => {
    if (!token) return;

    (async () => {
      const res = await apiFetch("/me");
      if (!res.ok) {
        // stale token → log out
        clearToken();
        setMe(null);
        navigate("/login", { replace: true });
        return;
      }
      setMe(await res.json());
    })();
  }, [token, navigate]);

  useEffect(() => {
    const loadSubEventEvent = async () => {
      if (!subeventId) {
        setSubEventEventId(null);
        return;
      }
      try {
        const res = await apiFetch(`/subevents/${subeventId}`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setSubEventEventId(data?.event_id ? String(data.event_id) : null);
      } catch {
        setSubEventEventId(null);
      }
    };
    loadSubEventEvent();
  }, [subeventId]);


  if (!token) return <Navigate to="/login" replace />;

  function logout() {
    clearToken();
    setMe(null);
    window.location.assign("/login");
  }

  const welcomeText = firstName ?? "";
  const fullName =
    me?.user.firstName || me?.user.lastName
      ? `${me?.user.firstName ?? ""} ${me?.user.lastName ?? ""}`.trim()
      : null;
  const helloText = fullName ? `Hello ${fullName}` : welcomeText ? `Hello ${welcomeText}` : null;

  const effectiveEventId = eventId || subEventEventId || eventQuery;
  const eventActions: Array<{
    to?: string;
    label: string;
    icon: "calendar" | "plus" | "users" | "list";
    disabled?: boolean;
  }> = [
    effectiveEventId
      ? { to: `/events/${effectiveEventId}/scores`, label: "Enter Scores", icon: "list" }
      : { label: "Enter Scores", icon: "list", disabled: true },
    effectiveEventId
      ? { to: `/events/${effectiveEventId}/handicaps`, label: "Post Handicaps", icon: "list" }
      : { label: "Post Handicaps", icon: "list", disabled: true },
    effectiveEventId
      ? { to: `/events/${effectiveEventId}/winnings`, label: "Add Event Winnings", icon: "list" }
      : { label: "Add Event Winnings", icon: "list", disabled: true },
    effectiveEventId
      ? { to: `/events/${effectiveEventId}/uploads`, label: "Upload Results", icon: "list" }
      : { label: "Upload Results", icon: "list", disabled: true },
  ];

  const navItems: Array<{
    to?: string;
    label: string;
    icon: "calendar" | "plus" | "users" | "list";
    disabled?: boolean;
    children?: Array<{
      to?: string;
      label: string;
      icon: "calendar" | "plus" | "users" | "list";
      disabled?: boolean;
    }>;
  }> = [
    {
      to: "/calendar",
      label: "Calendar",
      icon: "calendar",
      children: isEditEvent && fromCalendar ? eventActions : undefined,
    },
    {
      to: "/events",
      label: "Event List",
      icon: "list",
      children: isEditEvent && !fromCalendar ? eventActions : undefined,
    },
    { to: "/members", label: "Members", icon: "users" },
    { to: "/rosters", label: "Rosters", icon: "list" },
  ];
  if (me?.user.isAdmin) navItems.push({ to: "/users", label: "Users", icon: "users" });
  if (me?.user.isAdmin) {
    navItems.push({
      to: "/courses",
      label: me?.user.courseId ? "Course Info" : "Courses",
      icon: "list",
    });
  }

  function NavIcon({ name }: { name: "calendar" | "plus" | "users" | "list" }) {
    switch (name) {
      case "calendar":
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm13 8H4v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9Z"
              fill="currentColor"
            />
          </svg>
        );
      case "plus":
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5a1 1 0 0 1 1-1Z"
              fill="currentColor"
            />
          </svg>
        );
      case "users":
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M8.5 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm7 0a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7ZM2 20a5.5 5.5 0 0 1 11 0v1H2v-1Zm12 1v-1a6.5 6.5 0 0 0-1.4-4h2.4a4.5 4.5 0 0 1 4.5 4.5V21h-5.5Z"
              fill="currentColor"
            />
          </svg>
        );
      case "list":
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm4-1h12a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2Zm-4 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm4-1h12a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2Zm-4 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm4-1h12a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2Z"
              fill="currentColor"
            />
          </svg>
        );
    }
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="topbar">
        <div className="topbar-inner">
          <button
            type="button"
            className="iconBtn"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            onClick={() => {
              setUserToggled(true);
              setDrawerOpen(true);
            }}
          >
            {/* simple hamburger icon */}
            <span className="hamburger" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>

          <div className="brandBlock">
            <div className="brandLogo" aria-hidden="true">
              <svg viewBox="0 0 120 120">
                <defs>
                  <linearGradient id="mgo-gradient-shell" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#0b3d2e" />
                    <stop offset="100%" stopColor="#1f8a5b" />
                  </linearGradient>
                </defs>
                <path
                  d="M60 10c22 0 40 8 40 24v28c0 26-19 44-40 48-21-4-40-22-40-48V34c0-16 18-24 40-24Z"
                  fill="url(#mgo-gradient-shell)"
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
            </div>
            <div>
              <div className="brandTitle">Member Golf Online</div>
              {helloText ? <div className="brandSub">{helloText}</div> : null}
            </div>
          </div>

          {/* Right side: keep clean/minimal */}
          <div className="rightStub" />
        </div>
      </header>

      {/* Overlay (mobile only) */}
      {!isDesktop && drawerOpen && (
        <div
          className="overlay"
          onClick={() => {
            setUserToggled(true);
            setDrawerOpen(false);
          }}
        />
      )}

      {/* Drawer */}
      <aside
        className={`drawer ${drawerOpen ? "open" : ""} ${isDesktop ? "desktop" : ""}`}
        aria-label="Navigation"
      >
        <div className="drawerHeader">
          <div className="drawerTitle">Menu</div>
          <button
            type="button"
            className="iconBtn iconBtn-sm"
            aria-label="Close menu"
            onClick={() => {
              setUserToggled(true);
              setDrawerOpen(false);
            }}
          >
            ✕
          </button>
        </div>

        <nav className="drawerNav">
          {navItems.map((item) => {
            const link = item.to ? (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) => {
                  if (isEditEvent) {
                    const preferCalendar = fromCalendar;
                    const isParentRoute = item.to === "/calendar" || item.to === "/events";
                    const active =
                      isParentRoute &&
                      ((preferCalendar && item.to === "/calendar") ||
                        (!preferCalendar && item.to === "/events"));
                    return `navLink ${active ? "active" : ""}`;
                  }
                  return `navLink ${isActive ? "active" : ""}`;
                }}
              >
                <span className="navIcon" aria-hidden="true">
                  <NavIcon name={item.icon} />
                </span>
                {item.label}
              </NavLink>
            ) : (
              <button
                key={item.label}
                type="button"
                className={`navLink navButton ${item.disabled ? "disabled" : ""}`}
                disabled={item.disabled}
              >
                <span className="navIcon" aria-hidden="true">
                  <NavIcon name={item.icon} />
                </span>
                {item.label}
              </button>
            );

            return (
              <div key={`nav-${item.label}`}>
                {link}
                {item.children ? (
                  <div className="subNavList">
                    {item.children.map((child) => {
                      const childLink = child.to ? (
                        <NavLink
                          key={child.label}
                          to={child.to}
                          className={({ isActive }) =>
                            `subNavLink ${isActive ? "active" : ""}`.trim()
                          }
                        >
                          {child.label}
                        </NavLink>
                      ) : (
                        <button
                          key={child.label}
                          type="button"
                          className={`subNavLink subNavButton ${child.disabled ? "disabled" : ""}`}
                          disabled={child.disabled}
                        >
                          {child.label}
                        </button>
                      );
                      return <div key={`child-${child.label}`}>{childLink}</div>;
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}

          <div className="navSpacer" aria-hidden="true" />
          <button type="button" className="logoutBtn navLogout" onClick={logout}>
            Log out
          </button>
        </nav>
      </aside>

      {/* Content */}
      <main className={`content ${isCalendarRoute ? "calendar-full" : ""}`}>
        <div className={`content-inner ${isCalendarRoute ? "calendar-full" : ""}`}>
          <Outlet />
        </div>
      </main>

      {/* Minimal styles */}
      <style>{`
        :root {
          --bg: #f4f6fb;
          --card: #ffffff;
          --text: #111827;
          --muted: #6b7280;
          --border: #e5e7eb;
          --shadow: 0 10px 30px rgba(0,0,0,0.08);
          --radius: 14px;
          --accent: #2563eb;
          --accent-soft: rgba(37, 99, 235, 0.12);
        }

        * { box-sizing: border-box; }
        body { margin: 0; }
        body.calendar-full { overflow: hidden; }
        .app { min-height: 100vh; background: var(--bg); color: var(--text); height: 100vh; }
        .app {
          font-family: "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif;
        }

        .topbar {
          position: sticky; top: 0; z-index: 20;
          background: rgba(255, 255, 255, 0.85);
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(10px) saturate(120%);
        }
        .topbar-inner {
          max-width: 1100px; margin: 0 auto;
          padding: 14px 16px;
          display: flex; align-items: center; gap: 12px;
        }

        .iconBtn {
          width: 42px; height: 42px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: #fff;
          cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
          box-shadow: 0 1px 0 rgba(0,0,0,0.03);
        }
        .iconBtn:hover { background: #f7f8fb; }

        .hamburger { width: 18px; display: grid; gap: 4px; }
        .hamburger > span { height: 2px; width: 100%; background: #111; border-radius: 999px; opacity: 0.85; }

        .brandBlock {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .brandLogo {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(15, 118, 110, 0.25);
        }
        .brandLogo svg { width: 100%; height: 100%; display: block; }
        .brandTitle { font-weight: 700; letter-spacing: 0.2px; }
        .brandSub { font-size: 13px; color: var(--muted); }

        .rightStub { margin-left: auto; }

        .overlay {
          position: fixed; inset: 0; z-index: 30;
          background: rgba(17, 24, 39, 0.35);
        }

        .drawer {
          position: fixed; top: 0; left: 0; height: 100%;
          width: 300px;
          background: #f9fafb;
          border-right: 1px solid var(--border);
          transform: translateX(-105%);
          transition: transform 180ms ease;
          z-index: 40;
          box-shadow: var(--shadow);
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .drawer.open { transform: translateX(0); }
        .drawer.desktop { position: sticky; top: 0; height: calc(100vh - 0px); }

        .drawerHeader {
          padding: 8px 10px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid var(--border);
        }
        .drawerTitle {
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #9ca3af;
        }
        .iconBtn-sm {
          width: 26px; height: 26px;
          border-radius: 8px;
          font-size: 12px;
        }

        .drawerNav {
          padding: 8px 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow: hidden;
        }

        .navLink {
          text-decoration: none;
          color: var(--text);
          padding: 6px 8px;
          border-radius: 9px;
          border: 1px solid transparent;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
        }
        .navButton {
          background: transparent;
          cursor: default;
        }
        .navButton.disabled {
          color: var(--text);
          cursor: not-allowed;
        }
        .navButton.disabled .navIcon {
          color: #475569;
          background: #fff;
          border-color: var(--border);
        }
        .navLink:hover { background: #eef2ff; border-color: #e0e7ff; }
        .navLink.active {
          background: #e0e7ff;
          border-color: #c7d2fe;
          color: var(--text);
        }
        .navIcon {
          width: 22px;
          height: 22px;
          border-radius: 7px;
          background: #fff;
          border: 1px solid var(--border);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #475569;
          box-shadow: 0 1px 0 rgba(0,0,0,0.03);
          flex: 0 0 22px;
        }
        .navIcon svg { width: 13px; height: 13px; }
        .navLink.active .navIcon { color: #1d4ed8; border-color: #c7d2fe; }

        .subNavList { display: grid; gap: 4px; margin: 4px 0 8px 32px; }
        .subNavLink {
          font-size: 11px;
          color: #6b7280;
          text-decoration: none;
          padding: 3px 6px;
          border-radius: 8px;
          text-align: left;
          background: transparent;
          border: 1px solid transparent;
        }
        .subNavButton { cursor: default; }
        .subNavButton.disabled { cursor: not-allowed; }
        .subNavLink:hover { background: #f1f5f9; color: #111827; }
        .subNavLink.active {
          background: #e0e7ff;
          color: #1d4ed8;
          font-weight: 600;
        }

        .logoutBtn {
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: #fff;
          cursor: pointer;
          font-weight: 700;
          color: #444;
        }
        .logoutBtn:hover { background: #f7f8fb; }
        .navLogout {
          margin-top: auto;
          border-top: 1px solid var(--border);
          padding-top: 12px;
        }
        .navSpacer { height: 88px; flex: 0 0 auto; }
        .content { padding: 16px; overflow: auto; }
        .content-inner { max-width: 1100px; margin: 0 auto; }
        .content.calendar-full {
          padding: 16px 0;
          overflow: hidden;
        }
        .content-inner.calendar-full {
          max-width: none;
          margin: 0;
          width: 100%;
          min-height: 0;
        }

        @media (min-width: 900px) {
          .overlay { display: none; }
          .app {
            display: grid;
            grid-template-columns: 300px 1fr;
            grid-template-rows: auto 1fr;
          }
          .topbar { grid-column: 1 / -1; }
          .drawer {
            position: sticky;
            top: 0;
            height: calc(100vh - 0px);
            transform: none;
            box-shadow: none;
            z-index: 10;
          }
          .drawer:not(.open) { display: none; }
          .content { grid-column: 2; }
        }
      `}</style>
    </div>
  );
}
