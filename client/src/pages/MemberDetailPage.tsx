import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../auth";
import { formatHandicap } from "../utils/formatHandicap";

type Round = {
  card_id: number;
  event_id: number | null;
  card_dt: string | null;
  gross: number | null;
  net: number | null;
  adjustedscore: number | null;
  eventname: string | null;
  numholes: number | null;
  hole1?: number | null;
  hole2?: number | null;
  hole3?: number | null;
  hole4?: number | null;
  hole5?: number | null;
  hole6?: number | null;
  hole7?: number | null;
  hole8?: number | null;
  hole9?: number | null;
  hole10?: number | null;
  hole11?: number | null;
  hole12?: number | null;
  hole13?: number | null;
  hole14?: number | null;
  hole15?: number | null;
  hole16?: number | null;
  hole17?: number | null;
  hole18?: number | null;
};

type MemberDetail = {
  member: {
    member_id: number;
    firstname: string | null;
    lastname: string | null;
    email?: string | null;
    handicap: number | null;
    handicap18: number | null;
  };
  groups: Array<{
    nine_id: number;
    ninename: string | null;
    numholes: number | null;
    startinghole: number | null;
    hole1?: number | null;
    hole2?: number | null;
    hole3?: number | null;
    hole4?: number | null;
    hole5?: number | null;
    hole6?: number | null;
    hole7?: number | null;
    hole8?: number | null;
    hole9?: number | null;
    hole10?: number | null;
    hole11?: number | null;
    hole12?: number | null;
    hole13?: number | null;
    hole14?: number | null;
    hole15?: number | null;
    hole16?: number | null;
    hole17?: number | null;
    hole18?: number | null;
    rounds: Round[];
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString();
}

function formatAverage(value: number | null) {
  if (value === null || value === undefined) return "—";
  if (Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(1);
}

function getHoleLabels(numholes: number | null, startinghole: number | null): number[] {
  if (numholes === 9) {
    return startinghole === 10
      ? [10, 11, 12, 13, 14, 15, 16, 17, 18]
      : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  }
  if (numholes === 18) {
    return startinghole === 10
      ? [10, 11, 12, 13, 14, 15, 16, 17, 18, 1, 2, 3, 4, 5, 6, 7, 8, 9]
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  }
  return [1, 2, 3, 4, 5, 6, 7, 8, 9];
}

function getHoleValues(
  round: Round,
  labels: number[],
  numholes: number | null,
  startinghole: number | null
): Array<number | null | undefined> {
  if (numholes === 9 && startinghole === 10) {
    return labels.map((_, idx) => (round as any)[`hole${idx + 1}`]);
  }
  return labels.map((label) => (round as any)[`hole${label}`]);
}

function getParValues(
  group: MemberDetail["groups"][number],
  labels: number[],
  numholes: number | null,
  startinghole: number | null
): Array<number | null | undefined> {
  if (numholes === 9 && startinghole === 10) {
    return labels.map((_, idx) => (group as any)[`hole${idx + 1}`]);
  }
  return labels.map((label) => (group as any)[`hole${label}`]);
}

function getScoreMeta(score: number | null | undefined, par: number | null | undefined) {
  if (typeof score !== "number" || typeof par !== "number" || Number.isNaN(score) || Number.isNaN(par)) {
    return { className: "holeCell", style: undefined, showEagle: false };
  }
  const diff = score - par;
  if (diff === 0) return { className: "holeCell neutral", style: undefined, showEagle: false };
  if (diff === -1) return { className: "holeCell birdie", style: undefined, showEagle: false };
  if (diff <= -2) return { className: "holeCell eagle", style: undefined, showEagle: true };

  if (diff >= 1) {
    const bg = diff >= 4 ? "#1d4ed8" : diff === 3 ? "#3b82f6" : diff === 2 ? "#60a5fa" : "#93c5fd";
    const color = diff >= 3 ? "#eff6ff" : "#0f172a";
    return { className: "holeCell over", style: { background: bg, color }, showEagle: false };
  }

  return { className: "holeCell", style: undefined, showEagle: false };
}

function average(values: Array<number | null | undefined>) {
  const nums = values.filter((value): value is number => typeof value === "number");
  if (nums.length === 0) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

export default function MemberDetailPage() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [notice, setNotice] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [decimalHandicapEnabled, setDecimalHandicapEnabled] = useState(false);

  useEffect(() => {
    const loadCourseSettings = async () => {
      try {
        const res = await apiFetch("/course");
        if (!res.ok) return;
        const settings = await res.json();
        setDecimalHandicapEnabled(settings?.decimalhandicap_yn === 1);
      } catch {
        // ignore
      }
    };
    loadCourseSettings();
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      setNotice("");
      try {
        const res = await apiFetch(`/members/${memberId}`);
        if (!res.ok) throw new Error(await res.text());
        const detail = await res.json();
        setData(detail);
        setEmail(detail?.member?.email ?? "");
      } catch (e: any) {
        setError(e.message ?? "Failed to load member");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [memberId]);

  const fullName = useMemo(() => {
    const first = data?.member.firstname ?? "";
    const last = data?.member.lastname ?? "";
    return `${first} ${last}`.trim() || "Member";
  }, [data]);

  const sortedGroups = useMemo(() => {
    if (!data) return [];
    return [...data.groups].sort((a, b) => (a.numholes ?? 0) - (b.numholes ?? 0));
  }, [data]);

  const deleteMember = async () => {
    if (!memberId) return;
    if (!confirm("Delete this member and all related records?")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await apiFetch(`/members/${memberId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      navigate("/members", { replace: true });
    } catch (e: any) {
      setError(e.message ?? "Failed to delete member");
    } finally {
      setBusy(false);
    }
  };

  const saveEmail = async () => {
    if (!memberId) return;
    setEmailBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await apiFetch(`/members/${memberId}`, {
        method: "PUT",
        body: JSON.stringify({ email: email.trim() ? email.trim().toLowerCase() : null }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await apiFetch(`/members/${memberId}`);
      if (updated.ok) {
        const detail = await updated.json();
        setData(detail);
        setEmail(detail?.member?.email ?? "");
      }
      setNotice("Email saved.");
    } catch (e: any) {
      setError(e.message ?? "Failed to save email");
    } finally {
      setEmailBusy(false);
    }
  };

  const sendInvite = async () => {
    const value = email.trim();
    if (!value) {
      setError("Email is required to send an invite.");
      return;
    }
    setEmailBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await apiFetch("/auth/invite", {
        method: "POST",
        body: JSON.stringify({ email: value.toLowerCase() }),
      });
      if (!res.ok) throw new Error(await res.text());
      setNotice("Invite sent.");
    } catch (e: any) {
      setError(e.message ?? "Failed to send invite");
    } finally {
      setEmailBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="headerRow">
        <Link className="backLink" to="/members">
          ← Back to Members
        </Link>
      </div>

      {loading ? <div>Loading…</div> : null}
      {error ? <div className="error">{error}</div> : null}
      {notice ? <div className="toast">{notice}</div> : null}

      {data ? (
        <div className="grid">
          <section className="card">
            <div className="titleRow">
              <div className="nameRow">
                <h2>{fullName}</h2>
                <button
                  className="trashBtn"
                  onClick={deleteMember}
                  disabled={busy}
                  aria-label="Delete member"
                  title="Delete member"
                >
                  {busy ? (
                    "…"
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M9 3a1 1 0 0 0-1 1v1H5a1 1 0 1 0 0 2h1v11a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7h1a1 1 0 1 0 0-2h-3V4a1 1 0 0 0-1-1H9Zm1 2h4v1h-4V5Zm-1 4a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0v-7a1 1 0 0 1 1-1Zm6 1a1 1 0 1 0-2 0v7a1 1 0 1 0 2 0v-7Z"
                        fill="currentColor"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <div className="emailRow">
                <input
                  className="emailInput"
                  placeholder="member@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button className="btn" onClick={saveEmail} disabled={emailBusy}>
                  Save
                </button>
                <button className="btn primary" onClick={sendInvite} disabled={emailBusy}>
                  Send Invite
                </button>
              </div>
            </div>
            <div className="stats">
              <div className="stat">
                <div className="statLabel">9 Hole Handicap</div>
                <div className="statValue">
                  {formatHandicap(data.member.handicap, decimalHandicapEnabled)}
                </div>
              </div>
              <div className="stat">
                <div className="statLabel">18 Hole Handicap</div>
                <div className="statValue">
                  {formatHandicap(data.member.handicap18, decimalHandicapEnabled)}
                </div>
              </div>
            </div>
          </section>

          {sortedGroups.length === 0 ? (
            <section className="card">
              <h3>Rounds</h3>
              <div className="empty">No rounds</div>
            </section>
          ) : (
            sortedGroups.map((group) => (
              <section key={group.nine_id} className="card">
                <h3>
                  {group.ninename ?? "Nine"} {group.numholes ? `(${group.numholes} holes)` : ""}
                </h3>
                {(() => {
                  const holes = getHoleLabels(group.numholes, group.startinghole);
                  const holeCount = holes.length;
                  const avgHoles = holes.map((n, idx) =>
                    average(
                      group.rounds.map((round) =>
                        group.numholes === 9 && group.startinghole === 10
                          ? (round as any)[`hole${idx + 1}`]
                          : (round as any)[`hole${n}`]
                      )
                    )
                  );
                  const avgGross = average(group.rounds.map((round) => round.gross));
                  const avgNet = average(group.rounds.map((round) => round.net));
                  return (
                    <div className="rounds">
                      <div className="roundHead">
                        <div className="roundRow header">
                          <div className="roundDate">Date</div>
                          <div className="roundEvent">Event</div>
                          <div className="holesHeaderCell">
                            <div className="holesTitle">Holes</div>
                            <div
                              className="holesNumbers"
                              style={{
                                gridTemplateColumns: `repeat(${holeCount}, minmax(12px, 1fr))`,
                              }}
                            >
                              {holes.map((n) => (
                                <div key={n} className="holeNum">
                                  {n}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="roundScore">Gross</div>
                          <div className="roundScore">Net</div>
                          <div className="roundScore">Adj</div>
                        </div>
                      </div>
                      {group.rounds.length === 0 ? (
                        <div className="empty">No rounds</div>
                      ) : (
                        group.rounds.map((round) => (
                          <div key={round.card_id} className="roundBlock">
                            <div className="roundRow">
                              <div className="roundDate">{formatDate(round.card_dt)}</div>
                              <div className="roundEvent">{round.eventname ?? "Event"}</div>
                              <div
                                className="holesInline"
                                style={{
                                  gridTemplateColumns: `repeat(${holeCount}, minmax(12px, 1fr))`,
                                }}
                              >
                                {getHoleValues(round, holes, group.numholes, group.startinghole).map((score, idx) => {
                                  const parValues = getParValues(group, holes, group.numholes, group.startinghole);
                                  const meta = getScoreMeta(score, parValues[idx]);
                                  return (
                                    <div key={idx} className={meta.className} style={meta.style}>
                                      {meta.showEagle ? (
                                        <span className="eagleIcon" aria-hidden="true">
                                          🦅
                                        </span>
                                      ) : null}
                                      <span className="holeValue">{score ?? "—"}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="roundScore">{round.gross ?? "—"}</div>
                              <div className="roundScore">{round.net ?? "—"}</div>
                              <div className="roundScore">{round.adjustedscore ?? "—"}</div>
                            </div>
                          </div>
                        ))
                      )}
                      <div className="roundRow avgRow">
                        <div className="roundDate">Avg</div>
                        <div className="roundEvent" />
                        <div
                          className="holesInline"
                          style={{
                            gridTemplateColumns: `repeat(${holeCount}, minmax(12px, 1fr))`,
                          }}
                        >
                          {avgHoles.map((value, idx) => (
                            <div key={idx} className="holeAvg">
                              {formatAverage(value)}
                            </div>
                          ))}
                        </div>
                        <div className="roundScore">{formatAverage(avgGross)}</div>
                        <div className="roundScore">{formatAverage(avgNet)}</div>
                        <div />
                      </div>
                    </div>
                  );
                })()}
              </section>
            ))
          )}
        </div>
      ) : null}

      <style>{`
        .page { display: grid; gap: 12px; }
        .headerRow { display: flex; align-items: center; }
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
          gap: 6px;
        }
        .backLink:hover { background: #e5e7eb; }
        .grid { display: grid; gap: 12px; }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        h2 { margin: 0; font-size: 18px; }
        h3 { margin: 0 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; }
        .titleRow { display: grid; gap: 8px; margin-bottom: 10px; }
        .nameRow { display: flex; align-items: center; gap: 10px; }
        .emailRow { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .emailInput {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          font-size: 12px;
          min-width: 220px;
        }
        .trashBtn {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          border: 1px solid #fecaca;
          background: #fee2e2;
          color: #b91c1c;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .trashBtn svg { width: 16px; height: 16px; }
        .trashBtn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn {
          border: 1px solid #d1d5db;
          background: #fff;
          padding: 6px 10px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
        }
        .btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
        .stat { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; }
        .statLabel { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; }
        .statValue { font-size: 16px; font-weight: 700; color: #111827; margin-top: 4px; }
        .rounds { display: grid; gap: 4px; }
        .roundBlock { display: grid; gap: 4px; }
        .roundRow {
          display: grid; grid-template-columns: 80px 1fr 1fr 52px 52px 52px;
          gap: 8px; align-items: center;
          padding: 4px 8px; border-radius: 8px; color: #6b7280;
          background: #f9fafb;
        }
        .roundRow:nth-child(even) { background: #f0f7ff; }
        .roundHead { display: grid; gap: 4px; }
        .roundRow.header {
          background: transparent;
          padding: 0 8px 4px;
          border-radius: 0;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #9ca3af;
          font-weight: 600;
        }
        .roundRow.header > div { font-size: 10px; font-weight: 600; color: #9ca3af; }
        .roundDate { font-size: 11px; }
        .roundEvent { font-size: 11px; font-weight: 400; color: #6b7280; }
        .roundScore { text-align: right; font-size: 12px; font-weight: 700; color: #0f172a; }
        .holesHeaderCell { display: grid; gap: 4px; justify-items: center; }
        .holesTitle { text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; }
        .holesNumbers { display: grid; gap: 4px; width: 100%; justify-items: center; }
        .holeNum { text-align: center; font-size: 9px; color: #9ca3af; }
        .holesInline { display: grid; gap: 4px; }
        .avgRow { background: transparent; padding: 0 8px 6px; color: #94a3b8; }
        .avgRow .roundDate { font-size: 10px; }
        .avgRow .roundScore { font-size: 10px; font-weight: 600; color: #94a3b8; }
        .holeAvg { text-align: center; font-size: 9px; color: #94a3b8; }
        .holeCell {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 0;
          padding: 2px 0;
          text-align: center;
          font-size: 9px;
          color: #374151;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .holeCell.neutral { background: #ffffff; }
        .holeCell.birdie { background: #fee2e2; color: #991b1b; }
        .holeCell.eagle { background: #ffffff; color: #991b1b; }
        .holeCell.over { border-color: #bfdbfe; }
        .eagleIcon {
          color: #f97316;
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          opacity: 0.25;
          z-index: 0;
        }
        .holeValue { position: relative; z-index: 1; }
        .holeCell:nth-child(even) { background: inherit; }
        .empty { color: #9ca3af; font-size: 12px; padding: 4px 0; }
        .error { color: #a00; font-size: 12px; }
        .toast {
          color: #0f5132;
          background: #d1e7dd;
          border: 1px solid #badbcc;
          padding: 6px 10px;
          border-radius: 10px;
          font-size: 12px;
        }

        @media (max-width: 640px) {
          .roundRow { grid-template-columns: 70px 1fr 1fr 44px 44px 44px; }
          .holeCell { font-size: 8px; }
        }
      `}</style>
    </div>
  );
}
