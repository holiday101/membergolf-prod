import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { publicFetch } from "../../api/public";

export default function PublicShell() {
  const { courseId } = useParams();
  const location = useLocation();
  const base = `/public/${courseId}`;
  const isCalendarRoute = location.pathname === base;
  const desktopInit =
    typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches;
  const [drawerOpen, setDrawerOpen] = useState(desktopInit);
  const [isDesktop, setIsDesktop] = useState(desktopInit);
  const [userToggled, setUserToggled] = useState(false);
  const [leagueInfo, setLeagueInfo] = useState<string | null>(null);
  const [courseName, setCourseName] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [titleSponsorUrl, setTitleSponsorUrl] = useState<string | null>(null);
  const [courseWebsite, setCourseWebsite] = useState<string | null>(null);
  const [titleSponsorLink, setTitleSponsorLink] = useState<string | null>(null);

  const navItems: Array<{ to: string; label: string; icon: "calendar" | "list" | "users" }> = [
    { to: `${base}`, label: "Calendar", icon: "calendar" },
    { to: `${base}/events`, label: "Event List", icon: "list" },
    { to: `${base}/members`, label: "Members", icon: "users" },
  ];

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

  // Auto-close drawer on navigation for mobile
  useEffect(() => {
    if (!isDesktop) {
      setDrawerOpen(false);
    }
  }, [location.pathname, isDesktop]);

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      try {
        const course = await publicFetch<{
          leagueinfo: string | null;
          coursename?: string | null;
          logo_url?: string | null;
          titlesponsor_url?: string | null;
          website?: string | null;
          titlesponsor_link?: string | null;
        }>(
          `/public/${courseId}/course`
        );
        setLeagueInfo(course?.leagueinfo ?? null);
        setCourseName(course?.coursename ?? null);
        setLogoUrl(course?.logo_url ?? null);
        setTitleSponsorUrl(course?.titlesponsor_url ?? null);
        setCourseWebsite(course?.website ?? null);
        setTitleSponsorLink(course?.titlesponsor_link ?? null);
      } catch {
        setLeagueInfo(null);
        setCourseName(null);
        setLogoUrl(null);
        setTitleSponsorUrl(null);
        setCourseWebsite(null);
        setTitleSponsorLink(null);
      }
    })();
  }, [courseId]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = courseName?.trim() || "Member Golf Online";
  }, [courseName]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("public-calendar-full", isCalendarRoute);
    return () => {
      document.body.classList.remove("public-calendar-full");
    };
  }, [isCalendarRoute]);

  function NavIcon({ name }: { name: "calendar" | "list" | "users" }) {
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
    <div className={`app ${drawerOpen ? "drawer-open" : "drawer-closed"}`}>
      <header className="topbar">
        <div className="topbar-inner">
          <button
            type="button"
            className="iconBtn"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            onClick={() => {
              setUserToggled(true);
              setDrawerOpen((prev) => !prev);
            }}
          >
            <span className="hamburger" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
          <div className="brandBlock">
            {logoUrl ? (
              courseWebsite ? (
                <a href={courseWebsite} target="_blank" rel="noreferrer">
                  <img src={logoUrl} alt="League logo" className="brandImage" />
                </a>
              ) : (
                <img src={logoUrl} alt="League logo" className="brandImage" />
              )
            ) : null}
            <div className="brandTitle">{courseName ?? "Member Golf Online"}</div>
          </div>
          <div className="rightStub">
            {titleSponsorUrl ? (
              titleSponsorLink ? (
                <a href={titleSponsorLink} target="_blank" rel="noreferrer">
                  <img src={titleSponsorUrl} alt="Title sponsor" className="sponsorImage" />
                </a>
              ) : (
                <img src={titleSponsorUrl} alt="Title sponsor" className="sponsorImage" />
              )
            ) : null}
          </div>
        </div>
      </header>

      {!isDesktop && drawerOpen && (
        <div
          className="overlay"
          onClick={() => {
            setUserToggled(true);
            setDrawerOpen(false);
          }}
        />
      )}

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
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) => `navLink ${isActive ? "active" : ""}`}
            >
              <span className="navIcon" aria-hidden="true">
                <NavIcon name={item.icon} />
              </span>
              {item.label}
            </NavLink>
          ))}

          {leagueInfo ? (
            <div className="leagueInfo">
              <div className="leagueInfoLabel">League Info</div>
              <div className="leagueInfoText" dangerouslySetInnerHTML={{ __html: leagueInfo }} />
            </div>
          ) : null}
        </nav>
      </aside>

      <main className="content">
        <div className="content-inner">
          <Outlet />
        </div>
      </main>

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
        body.public-calendar-full { overflow: hidden; }
        .app { min-height: 100vh; background: var(--bg); color: var(--text); }
        .app {
          font-family: "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif;
          display: grid;
          grid-template-columns: 300px 1fr;
          grid-template-rows: auto 1fr;
        }

        .topbar {
          grid-column: 1 / -1;
          position: sticky; top: 0; z-index: 20;
          background: rgba(255, 255, 255, 0.85);
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(10px) saturate(120%);
        }
        .topbar-inner {
          max-width: 1100px; margin: 0 auto;
          padding: 6px 10px;
          display: flex; align-items: center; gap: 8px;
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

        .brandBlock { display: flex; align-items: center; gap: 10px; }
        .brandTitle { font-weight: 700; letter-spacing: 0.2px; }
        .rightStub { margin-left: auto; }
        .brandImage {
          height: 56px;
          max-width: 240px;
          object-fit: contain;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: #fff;
          padding: 3px 6px;
        }
        .sponsorImage {
          height: 56px;
          width: auto;
          max-width: none;
          max-height: none;
          object-fit: contain;
          border-radius: 0;
          border: none;
          background: transparent;
          padding: 0;
        }

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
          display: grid;
          gap: 6px;
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
        .navLink:hover { background: #eef2ff; border-color: #e0e7ff; }
        .navLink.active {
          background: #e0e7ff;
          border-color: #c7d2fe;
          color: #1d4ed8;
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

        .leagueInfo {
          margin-top: auto;
          border-top: 1px solid var(--border);
          padding: 12px 12px 0;
          color: var(--muted);
        }
        .leagueInfoLabel {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #9ca3af;
          margin-bottom: 6px;
          font-weight: 600;
        }
        .leagueInfoText {
          font-size: 12px;
          line-height: 1.35;
        }

        .content { padding: 16px; grid-column: 2; }
        .content-inner { max-width: 1100px; margin: 0 auto; }
        @media (min-width: 900px) {
          .overlay { display: none; }
          .app { grid-template-columns: 300px 1fr; grid-template-rows: auto 1fr; }
          .app.drawer-closed { grid-template-columns: 1fr; }
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
          .app.drawer-closed .content { grid-column: 1 / -1; }
        }
        @media (max-width: 899px) {
          .app { grid-template-columns: 1fr; }
          .content { grid-column: 1; }
        }
      `}</style>
    </div>
  );
}
