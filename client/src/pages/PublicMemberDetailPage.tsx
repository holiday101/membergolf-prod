import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { publicFetch } from "../api/public";

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
    handicap: number | null;
    handicap18: number | null;
  };
  groups: Array<{
    nine_id: number;
    ninename: string | null;
    numholes: number | null;
    startinghole: number | null;
    rounds: Round[];
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString();
}

function formatHandicap(value: number | null) {
  if (value === null || value === undefined) return "—";
  if (Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(2);
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

  const fullName = useMemo(() => {
    const first = data?.member.firstname ?? "";
    const last = data?.member.lastname ?? "";
    return `${first} ${last}`.trim() || "Member";
  }, [data]);
  const sortedGroups = useMemo(() => {
    if (!data) return [];
    return [...data.groups].sort((a, b) => (a.numholes ?? 0) - (b.numholes ?? 0));
  }, [data]);

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
            <h2>{fullName}</h2>
            <div className="stats">
              <div className="stat">
                <div className="statLabel">9 Hole Handicap</div>
                <div className="statValue">{formatHandicap(data.member.handicap)}</div>
              </div>
              <div className="stat">
                <div className="statLabel">18 Hole Handicap</div>
                <div className="statValue">{formatHandicap(data.member.handicap18)}</div>
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
                              gridTemplateColumns: `repeat(${group.numholes === 18 ? 18 : 9}, minmax(12px, 1fr))`,
                            }}
                          >
                          {getHoleValues(round, holes, group.numholes, group.startinghole).map((score, idx) => (
                            <div key={idx} className="holeCell">
                              {score ?? "—"}
                            </div>
                          ))}
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
        h2 { margin: 0 0 8px; font-size: 18px; }
        h3 { margin: 0 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; }

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
        }
        .holeCell:nth-child(even) { background: inherit; }
        .empty { color: #9ca3af; font-size: 12px; padding: 4px 0; }

        @media (max-width: 640px) {
          .roundRow { grid-template-columns: 70px 1fr 1fr 44px 44px 44px; }
          .holeCell { font-size: 8px; }
        }
      `}</style>
    </div>
  );
}
