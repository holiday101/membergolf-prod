import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../auth";

type WinningsRow = {
  eventotherpay_id: number;
  event_id: number;
  member_id: number | null;
  amount: number | null;
  description: string | null;
  firstname: string | null;
  lastname: string | null;
};

type Member = {
  member_id: number;
  firstname: string | null;
  lastname: string | null;
};

type EventRow = {
  eventname: string;
};

export default function EventWinningsPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [rows, setRows] = useState<WinningsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editMemberId, setEditMemberId] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [sortKey, setSortKey] = useState<"member" | "amount" | "description">("member");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const memberOptions = useMemo(
    () => members.map((m) => ({ value: String(m.member_id), label: `${m.lastname}, ${m.firstname}` })),
    [members]
  );

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    const getMember = (r: WinningsRow) =>
      `${(r.lastname || "").trim()}, ${(r.firstname || "").trim()}`.toLowerCase();
    copy.sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      if (sortKey === "member") {
        va = getMember(a);
        vb = getMember(b);
      } else if (sortKey === "amount") {
        va = a.amount ?? 0;
        vb = b.amount ?? 0;
      } else {
        va = (a.description || "").toLowerCase();
        vb = (b.description || "").toLowerCase();
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const [eventRes, membersRes, winningsRes] = await Promise.all([
        apiFetch(`/api/events/${id}`),
        apiFetch("/members"),
        apiFetch(`/api/events/${id}/winnings`),
      ]);
      if (!eventRes.ok) throw new Error(await eventRes.text());
      if (!membersRes.ok) throw new Error(await membersRes.text());
      if (!winningsRes.ok) throw new Error(await winningsRes.text());

      const [eventJson, membersJson, winningsJson] = await Promise.all([
        eventRes.json(),
        membersRes.json(),
        winningsRes.json(),
      ]);
      setEvent(eventJson);
      setMembers(membersJson);
      setRows(winningsJson);
    } catch (e: any) {
      setError(e.message ?? "Failed to load winnings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const startEdit = (row: WinningsRow) => {
    setEditId(row.eventotherpay_id);
    setEditMemberId(row.member_id ? String(row.member_id) : "");
    setEditAmount(row.amount != null ? String(row.amount) : "");
    setEditDescription(row.description ?? "");
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditMemberId("");
    setEditAmount("");
    setEditDescription("");
  };

  const saveEdit = async () => {
    if (!id || editId == null) return;
    if (!editMemberId) {
      setError("Select a member.");
      return;
    }
    if (!editAmount) {
      setError("Enter an amount.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/api/events/${id}/winnings/${editId}`, {
        method: "PUT",
        body: JSON.stringify({
          member_id: Number(editMemberId),
          amount: Number(editAmount),
          description: editDescription.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      cancelEdit();
      await loadData();
    } catch (e: any) {
      setError(e.message ?? "Failed to update winnings");
    } finally {
      setBusy(false);
    }
  };

  const deleteRow = async (rowId: number) => {
    if (!id) return;
    if (!confirm("Delete this winnings entry?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/api/events/${id}/winnings/${rowId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      if (editId === rowId) cancelEdit();
      await loadData();
    } catch (e: any) {
      setError(e.message ?? "Failed to delete winnings");
    } finally {
      setBusy(false);
    }
  };

  const toggleSort = (key: "member" | "amount" | "description") => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const submit = async () => {
    if (!id) return;
    if (!memberId) {
      setError("Select a member.");
      return;
    }
    if (!amount) {
      setError("Enter an amount.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/api/events/${id}/winnings`, {
        method: "POST",
        body: JSON.stringify({
          member_id: Number(memberId),
          amount: Number(amount),
          description: description.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMemberId("");
      setAmount("");
      setDescription("");
      await loadData();
    } catch (e: any) {
      setError(e.message ?? "Failed to add winnings");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="eventHeader">
        <Link className="backLink" to={id ? `/events/${id}` : "/events"}>
          ← Back to Event
        </Link>
        <div className="eventTitle">{event?.eventname ?? "Event"}</div>
      </div>
      {error ? <div className="error">{error}</div> : null}
      <div className="grid">
        <section className="card">
          <h2>Add Event Winnings</h2>
          <div className="form">
            <label className="formLabel">
              Member
              <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                <option value="">Select member</option>
                {memberOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="rowInputs">
              <label className="formLabel">
                Amount
                <input value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
              <label className="formLabel">
                Description
                <input value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
            </div>
            <div className="actions">
              <button className="btn primary" onClick={submit} disabled={busy}>
                {busy ? "Saving…" : "Add winnings"}
              </button>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>Winnings</h2>
          {loading ? <div>Loading…</div> : null}
          {editId != null ? (
            <div className="editPanel">
              <div className="editTitle">Edit Winnings</div>
              <div className="form">
                <label className="formLabel">
                  Member
                  <select value={editMemberId} onChange={(e) => setEditMemberId(e.target.value)}>
                    <option value="">Select member</option>
                    {memberOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rowInputs">
                  <label className="formLabel">
                    Amount
                    <input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                  </label>
                  <label className="formLabel">
                    Description
                    <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                  </label>
                </div>
                <div className="actions">
                  <button className="btn primary" onClick={saveEdit} disabled={busy}>
                    {busy ? "Saving…" : "Save"}
                  </button>
                  <button className="btn" onClick={cancelEdit} disabled={busy}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          <div className="table">
            <div className="tableHead">
              <button className="sortBtn" onClick={() => toggleSort("member")}>
                Member {sortKey === "member" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </button>
              <button className="sortBtn" onClick={() => toggleSort("amount")}>
                Amount {sortKey === "amount" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </button>
              <button className="sortBtn" onClick={() => toggleSort("description")}>
                Description {sortKey === "description" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </button>
              <span></span>
            </div>
            {sortedRows.map((r) => (
              <div key={r.eventotherpay_id} className="tableRow">
                <span>
                  {(r.lastname || "").trim()}, {(r.firstname || "").trim()}
                </span>
                <span>{r.amount != null ? Number(r.amount).toFixed(2) : "—"}</span>
                <span>{r.description ?? "—"}</span>
                <span className="actionsCol">
                  <button className="iconBtn" onClick={() => startEdit(r)} aria-label="Edit winnings">
                    ✎
                  </button>
                  <button
                    className="iconBtn"
                    onClick={() => deleteRow(r.eventotherpay_id)}
                    aria-label="Delete winnings"
                  >
                    🗑
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .page { display: grid; gap: 14px; }
        .eventHeader { display: flex; align-items: center; gap: 10px; }
        .eventTitle { font-size: 16px; font-weight: 700; color: #111827; }
        .backLink {
          color: #111827;
          text-decoration: none;
          font-weight: 600;
          font-size: 12px;
          background: #fff;
          border: 1px solid #d1d5db;
          padding: 6px 10px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          width: fit-content;
        }
        .grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        h2 { margin: 0 0 6px; font-size: 16px; }
        .muted { color: #6b7280; font-size: 12px; }
        .form { display: grid; gap: 10px; }
        .formLabel { color: #6b7280; display: grid; gap: 6px; font-weight: 600; font-size: 12px; }
        input, select { padding: 8px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 13px; }
        .rowInputs { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
        .actions { display: flex; gap: 8px; }
        .btn { border: 1px solid #d1d5db; background: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; }
        .btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .table { display: grid; gap: 8px; margin-top: 8px; }
        .tableHead, .tableRow { display: grid; gap: 8px; grid-template-columns: 2fr 1fr 2fr 56px; align-items: center; }
        .tableHead { font-weight: 600; font-size: 12px; color: #6b7280; }
        .tableRow { padding: 6px 0; border-top: 1px solid #f3f4f6; font-size: 12px; }
        .sortBtn {
          background: none;
          border: none;
          text-align: left;
          padding: 0;
          font: inherit;
          color: #6b7280;
          font-weight: 600;
          cursor: pointer;
        }
        .actionsCol { display: flex; justify-content: flex-end; gap: 6px; }
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
        .editPanel { margin: 6px 0 12px; border: 1px dashed #e5e7eb; border-radius: 10px; padding: 10px; }
        .editTitle { font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 6px; }
        .error { color: #a00; font-size: 12px; }
      `}</style>
    </div>
  );
}
