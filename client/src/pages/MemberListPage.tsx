import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../auth";
import { formatHandicap } from "../utils/formatHandicap";

type Member = {
  member_id: number;
  firstname: string | null;
  lastname: string | null;
  handicap: number | null;
};

export default function MemberListPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [handicap, setHandicap] = useState("");
  const [handicap18, setHandicap18] = useState("");
  const [sendInvite, setSendInvite] = useState(false);
  const [query, setQuery] = useState("");
  const [decimalHandicapEnabled, setDecimalHandicapEnabled] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadCourseSettings = async () => {
      try {
        const res = await apiFetch("/course");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.decimalhandicap_yn === 0 || data?.decimalhandicap_yn === 1) {
          setDecimalHandicapEnabled(data.decimalhandicap_yn === 1);
        }
      } catch {
        // ignore
      }
    };
    loadCourseSettings();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/members");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMembers(data);
    } catch (e: any) {
      setError(e.message ?? "Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const filteredMembers = members.filter((m) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const first = (m.firstname || "").toLowerCase();
    const last = (m.lastname || "").toLowerCase();
    const full = `${first} ${last}`.trim();
    const rev = `${last}, ${first}`.trim();
    return full.includes(q) || rev.includes(q) || last.includes(q) || first.includes(q);
  });

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    if (sendInvite && !email.trim()) {
      setError("Email is required to send an invite.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch("/members", {
        method: "POST",
        body: JSON.stringify({
          firstname: firstName.trim(),
          lastname: lastName.trim(),
          email: email.trim() ? email.trim().toLowerCase() : null,
          handicap: handicap ? Number(handicap) : null,
          handicap18: handicap18 ? Number(handicap18) : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      if (sendInvite && email.trim()) {
        const inviteRes = await apiFetch("/auth/invite", {
          method: "POST",
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        if (!inviteRes.ok) throw new Error(await inviteRes.text());
      }
      setFirstName("");
      setLastName("");
      setEmail("");
      setHandicap("");
      setHandicap18("");
      setSendInvite(false);
      await loadMembers();
    } catch (e: any) {
      setError(e.message ?? "Failed to add member");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      {error ? <div className="error">{error}</div> : null}
      <div className="grid">
        <section className="card listCard">
          <div className="listHeader">
            <h2>Members</h2>
            <input
              className="search"
              placeholder="Search members…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          {loading ? <div>Loading…</div> : null}
          <div className="list">
            <div className="row header">
              <div className="name">Member</div>
              <div className="handicap">Handicap</div>
              <div className="actionsCol"></div>
            </div>
            {filteredMembers.map((m) => (
              <div
                key={m.member_id}
                className="row clickable"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/members/${m.member_id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/members/${m.member_id}`);
                  }
                }}
              >
                <div className="name">
                  {(m.lastname || "").trim()}, {(m.firstname || "").trim()}
                </div>
                <div className="handicap">
                  {formatHandicap(m.handicap, decimalHandicapEnabled)}
                </div>
                <div className="actionsCol">
                  <button
                    className="iconBtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/members/${m.member_id}`);
                    }}
                    aria-label="Edit member"
                  >
                    ✎
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Add Member</h2>
          <div className="form">
            <div className="rowInputs">
              <label className="formLabel">
                First Name
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </label>
              <label className="formLabel">
                Last Name
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </label>
            </div>

            <div className="rowInputs">
              <label className="formLabel">
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="formLabel">
                Handicap (9)
                <input value={handicap} onChange={(e) => setHandicap(e.target.value)} />
              </label>
              <label className="formLabel">
                Handicap (18)
                <input value={handicap18} onChange={(e) => setHandicap18(e.target.value)} />
              </label>
            </div>

            <div className="actions">
              <label className="check">
                <input
                  type="checkbox"
                  checked={sendInvite}
                  onChange={(e) => setSendInvite(e.target.checked)}
                />
                Send invite email
              </label>
              <button className="btn primary" onClick={submit} disabled={busy}>
                {busy ? "Saving…" : "Add member"}
              </button>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .page { display: grid; gap: 14px; }
        .grid { display: grid; gap: 14px; grid-template-columns: 1.2fr 1fr; align-items: start; }
        @media (max-width: 980px) { .grid { grid-template-columns: 1fr; } }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        h2 { margin: 0 0 10px; font-size: 16px; }
        .listHeader { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
        .search {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          font-size: 12px;
          min-width: 220px;
        }
        .form { display: grid; gap: 10px; }
        .formLabel { color: #6b7280; display: grid; gap: 6px; font-weight: 600; font-size: 12px; }
        input { padding: 8px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 13px; }
        .rowInputs { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); }
        .actions { display: flex; gap: 8px; }
        .check { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #374151; }
        .btn { border: 1px solid #d1d5db; background: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; }
        .btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .list { display: grid; gap: 2px; }
        .listCard { padding-bottom: 10px; }
        .row { display: grid; grid-template-columns: 1fr 70px 28px; align-items: center; padding: 2px 6px; line-height: 1.1; color: #6b7280; }
        .row:nth-child(even) { background: #f0f7ff; }
        .row.clickable { cursor: pointer; }
        .row.clickable:hover { background: #e0f2fe; }
        .row.header { font-weight: 600; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; }
        .name { font-weight: 600; font-size: 11px; }
        .handicap { font-size: 10px; }
        .actionsCol { display: flex; justify-content: flex-end; }
        .iconBtn {
          width: 22px; height: 22px;
          border-radius: 7px;
          border: 1px solid #d1d5db;
          background: #fff;
          cursor: pointer;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .iconBtn:hover { background: #f7f8fb; }
        .error { color: #a00; font-size: 12px; }
      `}</style>
    </div>
  );
}
