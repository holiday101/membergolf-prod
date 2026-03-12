import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../auth";

type Member = {
  member_id: number;
  firstname: string | null;
  lastname: string | null;
  handicap: number | null;
};

type RosterMembersResponse = {
  roster?: {
    roster_id: number;
    rostername: string | null;
  };
  onRoster?: Member[];
  notOnRoster?: Member[];
};

function displayName(member: Member): string {
  return `${(member.lastname ?? "").trim()}, ${(member.firstname ?? "").trim()}`;
}

function sortMembers(a: Member, b: Member): number {
  const lastA = (a.lastname ?? "").trim().toLowerCase();
  const lastB = (b.lastname ?? "").trim().toLowerCase();
  if (lastA !== lastB) return lastA.localeCompare(lastB);

  const firstA = (a.firstname ?? "").trim().toLowerCase();
  const firstB = (b.firstname ?? "").trim().toLowerCase();
  if (firstA !== firstB) return firstA.localeCompare(firstB);

  return a.member_id - b.member_id;
}

function filterMembers(members: Member[], query: string): Member[] {
  const q = query.trim().toLowerCase();
  if (!q) return members;

  return members.filter((member) => {
    const first = (member.firstname ?? "").toLowerCase();
    const last = (member.lastname ?? "").toLowerCase();
    const full = `${first} ${last}`.trim();
    const rev = `${last}, ${first}`.trim();
    return first.includes(q) || last.includes(q) || full.includes(q) || rev.includes(q);
  });
}

export default function RosterMembersPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const rosterId = Number(id);

  const [rosterName, setRosterName] = useState<string>("Roster");
  const [onRoster, setOnRoster] = useState<Member[]>([]);
  const [notOnRoster, setNotOnRoster] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [busyMembers, setBusyMembers] = useState<Set<number>>(new Set());
  const [queryOn, setQueryOn] = useState("");
  const [queryOff, setQueryOff] = useState("");

  const loadData = async () => {
    if (!Number.isFinite(rosterId)) {
      setError("Invalid roster id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/rosters/${rosterId}/members`);
      if (!res.ok) throw new Error(await res.text());

      const data: RosterMembersResponse = await res.json();
      setRosterName(data.roster?.rostername?.trim() || `Roster ${rosterId}`);
      setOnRoster([...(data.onRoster ?? [])].sort(sortMembers));
      setNotOnRoster([...(data.notOnRoster ?? [])].sort(sortMembers));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load roster members";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterId]);

  const visibleOnRoster = useMemo(() => filterMembers(onRoster, queryOn), [onRoster, queryOn]);
  const visibleNotOnRoster = useMemo(
    () => filterMembers(notOnRoster, queryOff),
    [notOnRoster, queryOff]
  );

  const setBusy = (memberId: number, isBusy: boolean) => {
    setBusyMembers((prev) => {
      const next = new Set(prev);
      if (isBusy) next.add(memberId);
      else next.delete(memberId);
      return next;
    });
  };

  const addToRoster = async (member: Member) => {
    if (!Number.isFinite(rosterId)) return;
    setBusy(member.member_id, true);
    setError("");

    try {
      const res = await apiFetch(`/rosters/${rosterId}/members`, {
        method: "POST",
        body: JSON.stringify({ member_id: member.member_id }),
      });
      if (!res.ok) throw new Error(await res.text());

      setNotOnRoster((prev) => prev.filter((m) => m.member_id !== member.member_id));
      setOnRoster((prev) => [...prev, member].sort(sortMembers));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to add member to roster";
      setError(message);
    } finally {
      setBusy(member.member_id, false);
    }
  };

  const removeFromRoster = async (member: Member) => {
    if (!Number.isFinite(rosterId)) return;
    setBusy(member.member_id, true);
    setError("");

    try {
      const res = await apiFetch(`/rosters/${rosterId}/members/${member.member_id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());

      setOnRoster((prev) => prev.filter((m) => m.member_id !== member.member_id));
      setNotOnRoster((prev) => [...prev, member].sort(sortMembers));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to remove member from roster";
      setError(message);
    } finally {
      setBusy(member.member_id, false);
    }
  };

  return (
    <div className="page">
      <div className="headerRow">
        <button className="btn" onClick={() => navigate("/rosters")}>Back to Rosters</button>
        <div className="titleWrap">
          <h2>{rosterName}</h2>
          <div className="muted">Move members between lists.</div>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {loading ? <div className="muted">Loading…</div> : null}

      {!loading ? (
        <div className="grid">
          <section className="card">
            <div className="sectionHeader">
              <h3>On Roster ({onRoster.length})</h3>
              <input
                className="search"
                value={queryOn}
                onChange={(e) => setQueryOn(e.target.value)}
                placeholder="Search on roster…"
              />
            </div>
            <div className="list">
              <div className="row header">
                <div className="name">Member</div>
                <div className="hdcp">Hdcp</div>
                <div className="actionsCol"></div>
              </div>
              {visibleOnRoster.map((member) => (
                <div key={member.member_id} className="row">
                  <div className="name">{displayName(member)}</div>
                  <div className="hdcp">{member.handicap ?? "—"}</div>
                  <div className="actionsCol">
                    <button
                      className="btn"
                      onClick={() => removeFromRoster(member)}
                      disabled={busyMembers.has(member.member_id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {!visibleOnRoster.length ? <div className="muted">No members on this roster.</div> : null}
            </div>
          </section>

          <section className="card">
            <div className="sectionHeader">
              <h3>Not On Roster ({notOnRoster.length})</h3>
              <input
                className="search"
                value={queryOff}
                onChange={(e) => setQueryOff(e.target.value)}
                placeholder="Search available members…"
              />
            </div>
            <div className="list">
              <div className="row header">
                <div className="name">Member</div>
                <div className="hdcp">Hdcp</div>
                <div className="actionsCol"></div>
              </div>
              {visibleNotOnRoster.map((member) => (
                <div key={member.member_id} className="row">
                  <div className="name">{displayName(member)}</div>
                  <div className="hdcp">{member.handicap ?? "—"}</div>
                  <div className="actionsCol">
                    <button
                      className="btn primary"
                      onClick={() => addToRoster(member)}
                      disabled={busyMembers.has(member.member_id)}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
              {!visibleNotOnRoster.length ? (
                <div className="muted">All members are already on this roster.</div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      <style>{`
        .page { display: grid; gap: 14px; }
        .headerRow { display: flex; gap: 10px; align-items: center; }
        .titleWrap h2 { margin: 0; font-size: 18px; }
        .titleWrap .muted { margin-top: 2px; }
        .grid { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(280px, 1fr)); }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        .sectionHeader { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
        .sectionHeader h3 { margin: 0; font-size: 14px; }
        .search {
          min-width: 190px;
          padding: 7px 9px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 12px;
        }
        .list { display: grid; gap: 2px; }
        .row { display: grid; grid-template-columns: 1fr 70px 90px; align-items: center; gap: 8px; padding: 2px 6px; }
        .row:nth-child(even) { background: #f0f7ff; }
        .row.header { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; }
        .name { font-size: 12px; font-weight: 600; color: #111827; }
        .hdcp { font-size: 12px; color: #374151; }
        .actionsCol { display: flex; justify-content: flex-end; }
        .btn {
          border: 1px solid #d1d5db;
          background: #fff;
          padding: 6px 10px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
        }
        .btn.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
        .btn:disabled { cursor: not-allowed; opacity: 0.7; }
        .muted { color: #6b7280; font-size: 12px; }
        .error { color: #a00; font-size: 12px; }
        @media (max-width: 980px) {
          .grid { grid-template-columns: 1fr; }
          .sectionHeader { align-items: flex-start; flex-direction: column; }
          .search { width: 100%; min-width: 0; box-sizing: border-box; }
        }
      `}</style>
    </div>
  );
}
