import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { publicFetch } from "../api/public";
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

type Winning = {
  moneylist_id: number;
  amount: number;
  payout_date: string | null;
  payout_type: string | null;
  place: number | null;
  description: string | null;
  eventname: string | null;
};

type CalcRound = {
  card_id: number;
  event_id: number | null;
  card_dt: string | null;
  numholes: number | null;
  gross: number | null;
  net: number | null;
  adjustedscore: number | null;
  hdiff: number | null;
  eventname: string | null;
  used_in_calc: boolean;
};

type CalcResult = {
  total_scores: number;
  used_count: number;
  used_hdiff_sum: number;
  rounds: CalcRound[];
};

type MemberDetail = {
  member: {
    member_id: number;
    firstname: string | null;
    lastname: string | null;
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
  handicap_cutoff_dt?: string | null;
  handicap_calculation?: {
    cardsmax: number;
    cardsused: number;
    current: CalcResult;
    pending: (CalcResult & { pending_handicap: number | null }) | null;
  };
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

function formatHdiff(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return Number(value).toFixed(2);
}

function CalcTable({ rounds }: { rounds: CalcRound[] }) {
  return (
    <div className="calcTable">
      <div className="calcRow calcHead">
        <div>Card Date</div>
        <div>Event</div>
        <div>Gross</div>
        <div>Net</div>
        <div>Adj</div>
        <div>HDiff</div>
      </div>
      {rounds.map((r) => (
        <div key={r.card_id} className={`calcRow ${r.used_in_calc ? "usedRow" : ""}`}>
          <div>{formatDate(r.card_dt)}</div>
          <div>{r.eventname ?? "Event"}</div>
          <div>{r.gross ?? "—"}</div>
          <div>{r.net ?? "—"}</div>
          <div>{r.adjustedscore ?? "—"}</div>
          <div>{formatHdiff(r.hdiff)}</div>
        </div>
      ))}
    </div>
  );
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
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
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

export default function PublicMemberDetailPage() {
  const { courseId, memberId } = useParams();
  const [data, setData] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [decimalHandicapEnabled, setDecimalHandicapEnabled] = useState(false);
  const [moneyTotal, setMoneyTotal] = useState<number | null>(null);
  const [moneyRank, setMoneyRank] = useState<number | null>(null);
  const [moneyLoading, setMoneyLoading] = useState(false);
  const [winnings, setWinnings] = useState<Winning[]>([]);
  const [winningsLoading, setWinningsLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const detail = await publicFetch<MemberDetail>(
          `/public/${courseId}/members/${memberId}`
        );
        setData(detail);
      } catch (e: any) {
        setError(e.message ?? "Failed to load member");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [courseId, memberId]);

  useEffect(() => {
    const loadCourseSettings = async () => {
      if (!courseId) return;
      try {
        const course = await publicFetch<any>(`/public/${courseId}/course`);
        setDecimalHandicapEnabled(course?.decimalhandicap_yn === 1);
      } catch {
        // ignore
      }
    };
    loadCourseSettings();
  }, [courseId]);

  useEffect(() => {
    const loadMoney = async () => {
      if (!courseId || !memberId) return;
      setMoneyLoading(true);
      try {
        const year = new Date().getFullYear();
        const rows = await publicFetch<Array<{ member_id: number; total_amount: number }>>(
          `/public/${courseId}/moneylist?year=${year}`
        );
        const matchIndex = rows.findIndex((row) => String(row.member_id) === String(memberId));
        const match = matchIndex >= 0 ? rows[matchIndex] : null;
        setMoneyTotal(match?.total_amount ?? 0);
        if (rows.length === 0) {
          setMoneyRank(1);
        } else {
          setMoneyRank(matchIndex >= 0 ? matchIndex + 1 : null);
        }
      } catch {
        setMoneyTotal(null);
      } finally {
        setMoneyLoading(false);
      }
    };
    loadMoney();
  }, [courseId, memberId]);

  useEffect(() => {
    const loadWinnings = async () => {
      if (!courseId || !memberId) return;
      setWinningsLoading(true);
      try {
        const year = new Date().getFullYear();
        const rows = await publicFetch<Winning[]>(
          `/public/${courseId}/members/${memberId}/winnings?year=${year}`
        );
        setWinnings(rows);
      } catch {
        setWinnings([]);
      } finally {
        setWinningsLoading(false);
      }
    };
    loadWinnings();
  }, [courseId, memberId]);

  const fullName = useMemo(() => {
    const first = data?.member.firstname ?? "";
    const last = data?.member.lastname ?? "";
    return `${first} ${last}`.trim() || "Member";
  }, [data]);
  const sortedGroups = useMemo(() => {
    if (!data) return [];
    return [...data.groups].sort((a, b) => (a.numholes ?? 0) - (b.numholes ?? 0));
  }, [data]);

  const currentYear = new Date().getFullYear();
  const winningsTotal = useMemo(
    () => winnings.reduce((sum, w) => sum + w.amount, 0),
    [winnings]
  );
  const moneyFormatter = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
    []
  );

  return (
    <div className="page">
      <div className="headerRow">
        <Link className="backLink" to={`/public/${courseId}/members`}>
          ← Back to Members
        </Link>
      </div>

      {loading ? <div>Loading…</div> : null}
      {error ? <div style={{ color: "#a00" }}>{error}</div> : null}

      {data ? (
        <div className="grid">
          <section className="card">
            <h2>
              {fullName}{" "}
              <span style={{ fontWeight: 500, color: "#6b7280" }}>
                ({formatHandicap(data.member.handicap, true)}
                {data.handicap_cutoff_dt ? ` as of ${new Date(data.handicap_cutoff_dt).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric", timeZone: "UTC" })}` : ""})
              </span>
            </h2>
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
              <div className="stat">
                <div className="statLabel">Money List ({currentYear})</div>
                <div className="statValue">
                  {moneyLoading ? (
                    "Loading…"
                  ) : moneyTotal === null ? (
                    "—"
                  ) : (
                    <>
                      {moneyFormatter.format(moneyTotal)}
                      {moneyRank ? (
                        <span className="rankText">
                          {moneyRank === 1 && moneyTotal === 0 ? " (T-1)" : ` (Rank #${moneyRank})`}
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="card">
            <h3>Season Winnings ({currentYear})</h3>
            {winningsLoading ? (
              <div className="empty">Loading…</div>
            ) : winnings.length === 0 ? (
              <div className="empty">No winnings this season</div>
            ) : (
              <div className="winningsTable">
                <div className="winningsRow winningsHead">
                  <div>Date</div>
                  <div>Event</div>
                  <div>Type</div>
                  <div>Place</div>
                  <div className="winningsAmt">Amount</div>
                </div>
                {winnings.map((w) => (
                  <div key={w.moneylist_id} className="winningsRow">
                    <div>{formatDate(w.payout_date)}</div>
                    <div>{w.eventname ?? w.description ?? "—"}</div>
                    <div>{w.payout_type ?? "—"}</div>
                    <div>{w.place != null ? `#${w.place}` : "—"}</div>
                    <div className="winningsAmt">{moneyFormatter.format(w.amount)}</div>
                  </div>
                ))}
                <div className="winningsRow winningsTotal">
                  <div />
                  <div />
                  <div />
                  <div>Total</div>
                  <div className="winningsAmt">{moneyFormatter.format(winningsTotal)}</div>
                </div>
              </div>
            )}
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
                  const displayedRounds = group.rounds.slice(0, 10);
                  const holes = getHoleLabels(group.numholes, group.startinghole);
                  const holeCount = holes.length;
                  const avgHoles = holes.map((n, idx) =>
                    average(
                      displayedRounds.map((round) =>
                        group.numholes === 9 && group.startinghole === 10
                          ? (round as any)[`hole${idx + 1}`]
                          : (round as any)[`hole${n}`]
                      )
                    )
                  );
                  const avgGross = average(displayedRounds.map((round) => round.gross));
                  const avgNet = average(displayedRounds.map((round) => round.net));
                  return (
                <div className="rounds">
                  <div className="roundHead">
                    <div className="roundRow header">
                      <div className="roundDate">Card Date</div>
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
                  {displayedRounds.length === 0 ? (
                    <div className="empty">No rounds</div>
                  ) : (
                    displayedRounds.map((round) => (
                      <div key={round.card_id} className="roundBlock">
                        <div className="roundRow">
                          <div className="roundDate">{formatDate(round.card_dt)}</div>
                          <div className="roundEvent">{round.eventname ?? "Event"}</div>
                          <div
                            className="holesInline"
                            style={{
                              gridTemplateColumns: `repeat(${group.numholes === 18 ? 18 : 9}, minmax(12px, 1fr))`,
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
                          <div className="roundScore">
                            <span className="scoreLabel">Gross</span>
                            <span>{round.gross ?? "—"}</span>
                          </div>
                          <div className="roundScore">
                            <span className="scoreLabel">Net</span>
                            <span>{round.net ?? "—"}</span>
                          </div>
                          <div className="roundScore">
                            <span className="scoreLabel">Adj</span>
                            <span>{round.adjustedscore ?? "—"}</span>
                          </div>
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
                    <div className="roundScore">
                      <span className="scoreLabel">Gross</span>
                      <span>{formatAverage(avgGross)}</span>
                    </div>
                    <div className="roundScore">
                      <span className="scoreLabel">Net</span>
                      <span>{formatAverage(avgNet)}</span>
                    </div>
                    <div />
                  </div>
                </div>
                  );
                })()}
              </section>
            ))
          )}

          <section className="card">
            <h3>Handicap Calculation</h3>
            {data.handicap_calculation ? (
              <>
                <div className="calcMeta">
                  <span>Total Eligible Rounds: {data.handicap_calculation.current.total_scores}</span>
                  <span>Recent Pool (cardsmax): {data.handicap_calculation.cardsmax}</span>
                  <span>Used in Calc: {data.handicap_calculation.current.used_count}</span>
                  <span>Total HDiff Used: {formatHdiff(data.handicap_calculation.current.used_hdiff_sum)}</span>
                </div>
                {data.handicap_calculation.current.rounds.length === 0 ? (
                  <div className="empty">No handicap-eligible rounds</div>
                ) : (
                  <CalcTable rounds={data.handicap_calculation.current.rounds} />
                )}
              </>
            ) : (
              <div className="empty">No calculation details</div>
            )}
          </section>

          {data.handicap_calculation?.pending && data.handicap_calculation.pending.rounds.length > 0 && (
            <section className="card">
              <h3>Pending Rounds</h3>
              <div className="calcMeta">
                <span>Rounds since last cutoff: {data.handicap_calculation.pending.rounds.length}</span>
                <span>Pending Handicap: {formatHdiff(data.handicap_calculation.pending.pending_handicap)}</span>
                <span>Total Eligible (including pending): {data.handicap_calculation.pending.total_scores}</span>
                <span>Would Use in Calc: {data.handicap_calculation.pending.used_count}</span>
              </div>
              <CalcTable rounds={data.handicap_calculation.pending.rounds} />
            </section>
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
        h2 { margin: 0 0 8px; font-size: 18px; }
        h3 { margin: 0 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; }

        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
        .stat { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; }
        .statLabel { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; }
        .statValue { font-size: 16px; font-weight: 700; color: #111827; margin-top: 4px; }
        .rankText { font-weight: 600; color: #475569; }

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
        .scoreLabel { display: none; }
        .holesHeaderCell { display: grid; gap: 4px; justify-items: center; }
        .holesTitle { text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; }
        .holesNumbers { display: grid; gap: 4px; width: 100%; justify-items: center; }
        .holeNum {
          text-align: center;
          font-size: 9px;
          color: #9ca3af;
        }
        .holeNum { background: transparent; }
        .holesInline { display: grid; gap: 4px; }
        .avgRow {
          background: transparent;
          padding: 0 8px 6px;
          color: #94a3b8;
        }
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
        .empty { color: #9ca3af; font-size: 12px; padding: 4px 0; }

        .winningsTable { display: grid; gap: 4px; }
        .winningsRow {
          display: grid;
          grid-template-columns: 90px 1fr 80px 52px 80px;
          gap: 8px;
          align-items: center;
          font-size: 11px;
          color: #374151;
          background: #f9fafb;
          border-radius: 8px;
          padding: 6px 8px;
        }
        .winningsRow:nth-child(even) { background: #f0f7ff; }
        .winningsHead {
          background: transparent !important;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 10px;
          font-weight: 600;
          padding: 0 8px 4px;
          border-radius: 0;
        }
        .winningsTotal {
          background: transparent !important;
          font-weight: 700;
          color: #111827;
          border-top: 1px solid #e5e7eb;
          padding-top: 8px;
          border-radius: 0;
        }
        .winningsAmt { text-align: right; font-weight: 700; }
        .winningsHead .winningsAmt { font-weight: 600; }
        .calcMeta {
          display: grid;
          gap: 4px;
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 8px;
        }
        .calcTable { display: grid; gap: 4px; }
        .calcRow {
          display: grid;
          grid-template-columns: 100px 1fr 50px 50px 50px 70px;
          gap: 8px;
          align-items: center;
          font-size: 11px;
          color: #374151;
          background: #f9fafb;
          border-radius: 8px;
          padding: 6px 8px;
        }
        .calcRow:nth-child(even) { background: #f0f7ff; }
        .calcRow.usedRow { background: #fef9c3; }
        .calcHead {
          background: transparent !important;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 10px;
          font-weight: 600;
          padding: 0 8px 4px;
        }

        @media (max-width: 640px) {
          .roundRow { grid-template-columns: 70px 1fr 1fr 44px 44px 44px; }
          .holeCell { font-size: 8px; }
        }

        @media (max-width: 520px) {
          .roundRow {
            grid-template-columns: 1fr;
            gap: 6px;
            align-items: start;
          }
          .roundRow.header {
            display: none;
          }
          .roundDate, .roundEvent { font-size: 11px; }
          .roundScore {
            text-align: left;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
          }
          .scoreLabel {
            display: inline-block;
            min-width: 42px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #9ca3af;
            font-weight: 600;
          }
          .holesInline {
            grid-template-columns: repeat(9, minmax(12px, 1fr));
          }
          .calcRow {
            grid-template-columns: 1fr;
            gap: 4px;
            font-size: 11px;
          }
          .calcHead { display: none; }
          .roundScore { text-align: left; }
          .roundBlock { padding: 2px 0; }
          .roundRow .roundScore { font-size: 11px; }
          .roundRow .roundEvent { color: #4b5563; }
          .avgRow { display: none; }
        }
      `}</style>
    </div>
  );
}
