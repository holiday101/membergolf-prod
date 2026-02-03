import { useEffect, useState } from "react";
import { apiFetch } from "../auth";

type Roster = {
  roster_id: number;
  rostername: string | null;
  course_id: number | null;
  active_yn?: number | null;
};

type Flight = {
  flight_id: number;
  roster_id: number;
  flightname: string | null;
  hdcp1: number | null;
  hdcp2: number | null;
};

export default function RosterListPage() {
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [rosterName, setRosterName] = useState("");
  const [activeYn, setActiveYn] = useState(true);
  const [selectedRoster, setSelectedRoster] = useState<Roster | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [flightName, setFlightName] = useState("");
  const [hdcp1, setHdcp1] = useState("");
  const [hdcp2, setHdcp2] = useState("");
  const [flightBusy, setFlightBusy] = useState(false);
  const [deleteFlightId, setDeleteFlightId] = useState<number | null>(null);
  const [deleteRosterId, setDeleteRosterId] = useState<number | null>(null);

  const loadRosters = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/rosters");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRosters(data);
    } catch (e: any) {
      setError(e.message ?? "Failed to load rosters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRosters();
  }, []);

  const loadFlights = async (rosterId: number) => {
    try {
      const res = await apiFetch(`/rosters/${rosterId}/flights`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setFlights(data);
    } catch (e: any) {
      setError(e.message ?? "Failed to load flights");
    }
  };

  const submit = async () => {
    if (!rosterName.trim()) {
      setError("Roster name is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch("/rosters", {
        method: "POST",
        body: JSON.stringify({
          rostername: rosterName.trim(),
          active_yn: activeYn ? 1 : 0,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setRosterName("");
      setActiveYn(true);
      await loadRosters();
    } catch (e: any) {
      setError(e.message ?? "Failed to add roster");
    } finally {
      setBusy(false);
    }
  };

  const submitFlight = async () => {
    if (!selectedRoster) return;
    if (!flightName.trim()) {
      setError("Flight name is required.");
      return;
    }
    setFlightBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/rosters/${selectedRoster.roster_id}/flights`, {
        method: "POST",
        body: JSON.stringify({
          flightname: flightName.trim(),
          hdcp1: hdcp1 ? Number(hdcp1) : null,
          hdcp2: hdcp2 ? Number(hdcp2) : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setFlightName("");
      setHdcp1("");
      setHdcp2("");
      await loadFlights(selectedRoster.roster_id);
    } catch (e: any) {
      setError(e.message ?? "Failed to add flight");
    } finally {
      setFlightBusy(false);
    }
  };

  const deleteFlight = async (flightId: number) => {
    if (!selectedRoster) return;
    if (!confirm("Delete this flight?")) return;
    setDeleteFlightId(flightId);
    setError("");
    try {
      const res = await apiFetch(
        `/rosters/${selectedRoster.roster_id}/flights/${flightId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(await res.text());
      await loadFlights(selectedRoster.roster_id);
    } catch (e: any) {
      setError(e.message ?? "Failed to delete flight");
    } finally {
      setDeleteFlightId(null);
    }
  };

  const deleteRoster = async (rosterId: number) => {
    if (!confirm("Delete this roster and all related flights/members?")) return;
    setDeleteRosterId(rosterId);
    setError("");
    try {
      const res = await apiFetch(`/rosters/${rosterId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      if (selectedRoster?.roster_id === rosterId) {
        setSelectedRoster(null);
        setFlights([]);
      }
      await loadRosters();
    } catch (e: any) {
      setError(e.message ?? "Failed to delete roster");
    } finally {
      setDeleteRosterId(null);
    }
  };

  return (
    <div className="page">
      {error ? <div className="error">{error}</div> : null}
      <div className="grid">
        <section className="card addRoster">
          <h2>Add Roster</h2>
          <div className="form">
            <label className="formLabel">
              Roster Name
              <input
                value={rosterName}
                onChange={(e) => setRosterName(e.target.value)}
              />
            </label>

            <label className="formLabel checkbox">
              <input
                type="checkbox"
                checked={activeYn}
                onChange={(e) => setActiveYn(e.target.checked)}
              />
              Active
            </label>

            <div className="actions">
              <button className="btn primary" onClick={submit} disabled={busy}>
                {busy ? "Saving…" : "Add roster"}
              </button>
            </div>
          </div>
        </section>

        <section className="card rosterList">
          <h2>Rosters</h2>
          {loading ? <div>Loading…</div> : null}
          <div className="list">
            <div className="row header rosterRow">
              <div className="name">Roster</div>
              <div className="status">Active</div>
              <div className="actionsCol"></div>
            </div>
            {rosters.map((r) => (
              <div
                key={r.roster_id}
                className={`row rosterRow clickable ${selectedRoster?.roster_id === r.roster_id ? "selected" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedRoster(r);
                  loadFlights(r.roster_id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedRoster(r);
                    loadFlights(r.roster_id);
                  }
                }}
              >
                <div className="name">{r.rostername ?? "—"}</div>
                <div className="status">{r.active_yn === 0 ? "No" : "Yes"}</div>
                <div className="actionsCol">
                  <button
                    className="iconBtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRoster(r.roster_id);
                    }}
                    disabled={deleteRosterId === r.roster_id}
                    aria-label="Delete roster"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card rosterFlights">
          <h2>Roster Flights</h2>
          {!selectedRoster ? (
            <div className="muted">Select a roster to manage flights.</div>
          ) : (
            <>
              <div className="subTitle">{selectedRoster.rostername ?? "Roster"}</div>
              <div className="list">
                <div className="row header flightsRow">
                  <div className="name">Flight</div>
                  <div className="status">Hdcp</div>
                  <div className="actionsCol"></div>
                </div>
                {flights.map((f) => (
                  <div key={f.flight_id} className="row flightsRow">
                    <div className="name">{f.flightname ?? "—"}</div>
                    <div className="status">
                      {(f.hdcp1 ?? "—")} / {(f.hdcp2 ?? "—")}
                    </div>
                    <div className="actionsCol">
                      <button
                        className="iconBtn"
                        onClick={() => deleteFlight(f.flight_id)}
                        disabled={deleteFlightId === f.flight_id}
                        aria-label="Delete flight"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="form">
                <label className="formLabel">
                  Flight Name
                  <input
                    value={flightName}
                    onChange={(e) => setFlightName(e.target.value)}
                  />
                </label>
                <div className="rowInputs">
                  <label className="formLabel">
                    Hdcp 1
                    <input value={hdcp1} onChange={(e) => setHdcp1(e.target.value)} />
                  </label>
                  <label className="formLabel">
                    Hdcp 2
                    <input value={hdcp2} onChange={(e) => setHdcp2(e.target.value)} />
                  </label>
                </div>
                <div className="actions">
                  <button className="btn primary" onClick={submitFlight} disabled={flightBusy}>
                    {flightBusy ? "Saving…" : "Add flight"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

      </div>

      <style>{`
        .page { display: grid; gap: 14px; }
        .grid {
          display: grid;
          gap: 14px;
          grid-template-columns: minmax(260px, 360px) minmax(320px, 1fr);
          grid-template-rows: auto auto;
          grid-auto-rows: min-content;
        }
        .addRoster { grid-column: 1; grid-row: 1; }
        .rosterList { grid-column: 1; grid-row: 2; }
        .rosterFlights { grid-column: 2; grid-row: 1 / span 2; }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        h2 { margin: 0 0 10px; font-size: 16px; }
        .form { display: grid; gap: 10px; }
        .formLabel { color: #6b7280; display: grid; gap: 6px; font-weight: 600; font-size: 12px; }
        input { padding: 8px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 13px; }
        .checkbox { display: flex; align-items: center; gap: 8px; }
        .checkbox input { width: 16px; height: 16px; padding: 0; }
        .actions { display: flex; gap: 8px; }
        .btn { border: 1px solid #d1d5db; background: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; }
        .btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .list { display: grid; gap: 2px; }
        .row { display: flex; justify-content: space-between; padding: 2px 6px; line-height: 1.2; color: #6b7280; }
        .row:nth-child(even) { background: #f0f7ff; }
        .row.header { font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
        .row.clickable { cursor: pointer; }
        .row.clickable:hover { background: #e0f2fe; }
        .row.selected { background: #dbeafe; }
        .rosterRow { display: grid; grid-template-columns: 1fr 90px 34px; align-items: center; }
        .flightsRow { display: grid; grid-template-columns: 1fr 90px 34px; align-items: center; }
        .name { font-weight: 600; font-size: 12px; }
        .status { font-size: 11px; }
        .error { color: #a00; font-size: 12px; }
        .subTitle { font-size: 12px; color: #6b7280; margin-bottom: 8px; font-weight: 600; }
        .rowInputs { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); }
        .muted { color: #6b7280; font-size: 12px; }
        .actionsCol { display: flex; justify-content: flex-end; }
        .iconBtn {
          width: 24px; height: 24px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          background: #fff;
          cursor: pointer;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .iconBtn:hover { background: #f7f8fb; }

        @media (max-width: 900px) {
          .grid { grid-template-columns: 1fr; }
          .rosterList, .rosterFlights, .addRoster { grid-column: 1; }
        }
      `}</style>
    </div>
  );
}
