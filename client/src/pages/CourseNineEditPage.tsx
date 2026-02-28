import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../auth";

type HoleMap = Record<number, string>;

type NineDetail = {
  nine_id: number;
  course_id: number;
  ninename: string | null;
  sloperating: number | null;
  courserating: number | null;
  numholes: number | null;
  startinghole: number | null;
  [key: string]: any;
};

function makeHoleMap(defaultValue = "") {
  const out: HoleMap = {};
  for (let i = 1; i <= 18; i += 1) out[i] = defaultValue;
  return out;
}

export default function CourseNineEditPage() {
  const { courseId, nineId } = useParams();
  const navigate = useNavigate();
  const cid = Number(courseId);
  const nid = Number(nineId);

  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isGlobal, setIsGlobal] = useState(false);
  const [name, setName] = useState("");
  const [numholes, setNumholes] = useState("9");
  const [originalNumholes, setOriginalNumholes] = useState("9");
  const [startinghole, setStartinghole] = useState("1");
  const [sloperating, setSloperating] = useState("113");
  const [courserating, setCourserating] = useState("36");
  const [holes, setHoles] = useState<HoleMap>(makeHoleMap("4"));
  const [handicapHoles, setHandicapHoles] = useState<HoleMap>(makeHoleMap());

  const holeNums = useMemo(() => Array.from({ length: 18 }, (_, i) => i + 1), []);
  const visibleHoleCount = numholes === "18" ? 18 : 9;
  const visibleHoleNums = useMemo(() => holeNums.slice(0, visibleHoleCount), [holeNums, visibleHoleCount]);

  useEffect(() => {
    const run = async () => {
      if (!Number.isFinite(cid) || !Number.isFinite(nid)) {
        setError("Invalid course or layout id");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const meRes = await apiFetch("/me");
        if (meRes.ok) {
          const me = await meRes.json();
          setIsGlobal(!me?.user?.courseId);
        }

        const res = await apiFetch(`/courses/manage/${cid}/nines/${nid}`);
        if (!res.ok) throw new Error(await res.text());
        const row: NineDetail = await res.json();
        setName(row.ninename ?? "");
        const nh = row.numholes === 18 ? "18" : "9";
        setNumholes(nh);
        setOriginalNumholes(nh);
        setStartinghole(row.startinghole != null ? String(row.startinghole) : "1");
        setSloperating(row.sloperating != null ? String(row.sloperating) : "113");
        setCourserating(row.courserating != null ? String(row.courserating) : nh === "18" ? "72" : "36");

        const nextHoles = makeHoleMap("4");
        const nextHdcp = makeHoleMap("");
        for (let i = 1; i <= 18; i += 1) {
          const h = row[`hole${i}`];
          const d = row[`handicaphole${i}`];
          nextHoles[i] = h == null ? "" : String(h);
          nextHdcp[i] = d == null ? "" : String(d);
        }
        setHoles(nextHoles);
        setHandicapHoles(nextHdcp);
      } catch (err: any) {
        setError(String(err?.message || "Failed to load layout"));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [cid, nid]);

  const setHole = (idx: number, value: string) => setHoles((p) => ({ ...p, [idx]: value }));
  const setHdcp = (idx: number, value: string) => setHandicapHoles((p) => ({ ...p, [idx]: value }));

  async function submit() {
    if (!Number.isFinite(cid) || !Number.isFinite(nid)) {
      setError("Invalid course or layout id");
      return;
    }
    if (!name.trim()) {
      setError("Layout name is required");
      return;
    }

    {
      const required = visibleHoleCount;
      const values: number[] = [];
      for (let i = 1; i <= required; i += 1) {
        const raw = handicapHoles[i];
        if (!raw) {
          setError(`Handicap holes must include every value from 1 to ${required}.`);
          return;
        }
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 1 || n > required) {
          setError(`Handicap holes must be integers between 1 and ${required}.`);
          return;
        }
        values.push(n);
      }
      const uniq = new Set(values);
      if (uniq.size !== required) {
        setError(`Handicap holes must use each value 1 to ${required} exactly once.`);
        return;
      }
    }

    if (numholes !== originalNumholes) {
      const ok = window.confirm(
        "Warning: You changed the number of holes for this layout.\n\nDo not change this unless you completely understand how it affects existing events, cards, and scoring history.\n\nDo you want to continue saving?"
      );
      if (!ok) return;
    }

    setBusy(true);
    setError("");
    try {
      const payload: any = {
        ninename: name.trim(),
        numholes: numholes ? Number(numholes) : null,
        startinghole: startinghole ? Number(startinghole) : null,
        sloperating: sloperating ? Number(sloperating) : null,
        courserating: courserating ? Number(courserating) : null,
      };

      for (let i = 1; i <= 18; i += 1) {
        if (i <= visibleHoleCount) {
          payload[`hole${i}`] = holes[i] ? Number(holes[i]) : null;
          payload[`handicaphole${i}`] = handicapHoles[i] ? Number(handicapHoles[i]) : null;
        } else {
          payload[`hole${i}`] = null;
          payload[`handicaphole${i}`] = null;
        }
      }

      const res = await apiFetch(`/courses/manage/${cid}/nines/${nid}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      navigate(`/courses/${cid}/edit`, { replace: true, state: { toast: `Layout updated: ${name.trim()}.` } });
    } catch (err: any) {
      setError(String(err?.message || "Failed to save layout"));
    } finally {
      setBusy(false);
    }
  }

  async function removeNine() {
    if (!Number.isFinite(cid) || !Number.isFinite(nid)) {
      setError("Invalid course or layout id");
      return;
    }
    const title = name.trim() || `Layout #${nid}`;
    const ok = window.confirm(`Delete ${title}?\n\nThis action is permanent and cannot be undone.`);
    if (!ok) return;

    setDeleting(true);
    setError("");
    try {
      const res = await apiFetch(`/courses/manage/${cid}/nines/${nid}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      navigate(`/courses/${cid}/edit`, {
        replace: true,
        state: { toast: `Layout deleted: ${title}.` },
      });
    } catch (err: any) {
      setError(String(err?.message || "Failed to delete layout"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page">
      <Link className="backLink" to={`/courses/${cid}/edit`}>
        ← Back to Course
      </Link>

      {error ? (
        <div className="alert">
          <strong>Error:</strong> {error}
        </div>
      ) : null}

      <section className="card">
        <h2>Edit Layout</h2>
        {loading ? (
          <div className="muted">Loading…</div>
        ) : (
          <div className="form">
            <div className="row4">
              <label>
                Layout Name
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label>
                Number of Holes
                <select className="numInput" value={numholes} onChange={(e) => setNumholes(e.target.value)}>
                  <option value="9">9</option>
                  <option value="18">18</option>
                </select>
                {numholes !== originalNumholes ? (
                  <span className="warnText">
                    Warning: Do not change this unless you completely understand the impact.
                  </span>
                ) : null}
              </label>
              <label>
                Starting Hole
                <input className="numInput" value={startinghole} onChange={(e) => setStartinghole(e.target.value)} />
              </label>
              <label>
                Slope Rating
                <input className="numInput" value={sloperating} onChange={(e) => setSloperating(e.target.value)} />
              </label>
              <label>
                Course Rating
                <input className="numInput" value={courserating} onChange={(e) => setCourserating(e.target.value)} />
              </label>
            </div>

            <div className="gridHeader">
              <span>Hole</span>
              <span>Par</span>
              <span>Handicap Hole</span>
            </div>
            {visibleHoleNums.map((n, idx) => (
              <div key={n} className="gridRow">
                <span className="h">{n}</span>
                <input className="numInput" value={holes[n]} onChange={(e) => setHole(n, e.target.value)} tabIndex={idx + 1} />
                <input className="numInput" value={handicapHoles[n]} onChange={(e) => setHdcp(n, e.target.value)} tabIndex={visibleHoleNums.length + idx + 1} />
              </div>
            ))}

            <div className="actions">
              <div className="leftActions">
                <button className="btn primary" onClick={submit} disabled={busy}>
                  {busy ? "Saving…" : "Save Layout"}
                </button>
                <Link className="btn cancelBtn" to={`/courses/${cid}/edit`}>
                  Cancel
                </Link>
              </div>
              {isGlobal ? (
                <button
                  type="button"
                  className="iconDanger"
                  onClick={removeNine}
                  disabled={deleting || busy}
                  aria-label="Delete layout"
                  title="Delete layout"
                >
                  {deleting ? "…" : "🗑"}
                </button>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <style>{`
        .page { display: grid; gap: 14px; }
        .backLink { color: #0f172a; text-decoration: none; font-weight: 600; font-size: 12px; background: #f3f4f6; border: 1px solid #e5e7eb; padding: 6px 10px; border-radius: 999px; width: fit-content; }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        h2 { margin: 0 0 10px; font-size: 16px; }
        .form { display: grid; gap: 10px; }
        label { display: grid; gap: 4px; font-size: 12px; color: #6b7280; font-weight: 600; }
        input, select { padding: 8px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 13px; }
        .numInput { width: 72px; min-width: 72px; padding: 6px 8px; text-align: right; }
        .row4 { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
        .gridHeader, .gridRow { display: grid; grid-template-columns: 60px 100px 140px; gap: 8px; align-items: center; }
        .gridHeader { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-top: 6px; }
        .h { font-weight: 700; color: #334155; }
        .actions { margin-top: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .leftActions { display: inline-flex; align-items: center; gap: 8px; }
        .warnText { margin-top: 4px; font-size: 11px; font-weight: 700; color: #b45309; }
        .btn { border: 1px solid #d1d5db; background: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; }
        .btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .cancelBtn {
          background: #ffffff;
          border-color: #d1d5db;
          color: #475569;
          text-decoration: none;
          transition: background 140ms ease, border-color 140ms ease, transform 140ms ease;
        }
        .cancelBtn:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #334155;
        }
        .cancelBtn:active { background: #f1f5f9; }
        .iconDanger {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid #fecaca;
          background: #fff1f2;
          color: #b91c1c;
          cursor: pointer;
          font-size: 15px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background 140ms ease, border-color 140ms ease, transform 140ms ease;
        }
        .iconDanger:hover { background: #ffe4e6; border-color: #fda4af; transform: translateY(-1px); }
        .iconDanger:active { transform: translateY(0); }
        .iconDanger:disabled { opacity: 0.6; cursor: not-allowed; }
        .alert { padding: 10px 12px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; color: #991b1b; }
        .muted { color: #6b7280; font-size: 12px; }
      `}</style>
    </div>
  );
}
