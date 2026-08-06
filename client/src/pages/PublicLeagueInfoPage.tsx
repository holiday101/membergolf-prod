import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { publicFetch } from "../api/public";

export default function PublicLeagueInfoPage() {
  const { courseId } = useParams();
  const [leagueInfo, setLeagueInfo] = useState<string | null>(null);
  const [coursename, setCoursename] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const course = await publicFetch<{
          leagueinfo: string | null;
          coursename?: string | null;
        }>(`/public/${courseId}/course`);
        setLeagueInfo(course?.leagueinfo ?? null);
        setCoursename(course?.coursename ?? null);
      } catch (e: any) {
        setError(e.message ?? "Failed to load league info");
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  return (
    <div className="card">
      <div className="pageHeader">
        <h2>League Info</h2>
        {coursename ? <div className="pageSub">{coursename}</div> : null}
      </div>

      {loading ? <div className="muted">Loading…</div> : null}
      {error ? <div className="errorText">{error}</div> : null}
      {!loading && !error && !leagueInfo ? (
        <div className="muted">No league info has been posted yet.</div>
      ) : null}

      {leagueInfo ? (
        <div className="leagueInfoFull" dangerouslySetInnerHTML={{ __html: leagueInfo }} />
      ) : null}

      <style>{`
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px 20px; }
        .pageHeader { margin-bottom: 14px; }
        .pageHeader h2 { margin: 0; font-size: 17px; font-weight: 700; color: #111827; }
        .pageSub { font-size: 12.5px; color: #6b7280; margin-top: 2px; }
        .muted { color: #6b7280; font-size: 13px; }
        .errorText { color: #a00; font-size: 13px; }

        .leagueInfoFull {
          font-size: 14px;
          line-height: 1.55;
          color: #111827;
          max-width: 760px;
          overflow-x: auto;
        }
        /* Neutralize fixed widths/fonts pasted in from Sheets/Word so it inherits the page's look */
        .leagueInfoFull, .leagueInfoFull * {
          font-family: inherit !important;
          font-size: inherit !important;
          line-height: inherit !important;
        }
        .leagueInfoFull table, .leagueInfoFull col { width: auto !important; }
        .leagueInfoFull table {
          table-layout: auto !important;
          border-collapse: collapse !important;
          max-width: 100%;
          margin: 6px 0 14px;
        }
        .leagueInfoFull td, .leagueInfoFull th {
          border: none !important;
          border-bottom: 1px solid #eef0f4 !important;
          padding: 7px 10px !important;
          text-align: left;
        }
        .leagueInfoFull img { max-width: 100%; height: auto; }
      `}</style>
    </div>
  );
}
