import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../auth";

type HoleMap = Record<number, string>;

function makeHoleMap(defaultValue = "") {
  const out: HoleMap = {};
  for (let i = 1; i <= 18; i += 1) out[i] = defaultValue;
  return out;
}

export default function CourseNineCreatePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const cid = Number(courseId);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [numholes, setNumholes] = useState("9");
  const [startinghole, setStartinghole] = useState("1");
  const [sloperating, setSloperating] = useState("113");
  const [courserating, setCourserating] = useState("36");
  const [holes, setHoles] = useState<HoleMap>(makeHoleMap("4"));
  const [handicapHoles, setHandicapHoles] = useState<HoleMap>(makeHoleMap());

  const holeNums = useMemo(() => Array.from({ length: 18 }, (_, i) => i + 1), []);
  const visibleHoleCount = numholes === "18" ? 18 : 9;
  const visibleHoleNums = useMemo(
    () => holeNums.slice(0, visibleHoleCount),
    [holeNums, visibleHoleCount]
  );

  useEffect(() => {
    setCourserating(numholes === "18" ? "72" : "36");
  }, [numholes]);

  useEffect(() => {
    const count = numholes === "18" ? 18 : 9;
    setHandicapHoles((prev) => {
      const next = { ...prev };
      for (let i = 1; i <= 18; i += 1) {
        next[i] = i <= count ? String(i) : "";
      }
      return next;
    });
  }, [numholes]);

  const setHole = (idx: number, value: string) => setHoles((p) => ({ ...p, [idx]: value }));
  const setHdcp = (idx: number, value: string) => setHandicapHoles((p) => ({ ...p, [idx]: value }));

  async function submit() {
    if (!Number.isFinite(cid)) {
      setError("Invalid course id");
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

      const res = await apiFetch(`/courses/manage/${cid}/nines`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      navigate(`/courses/${cid}/edit`, { replace: true, state: { toast: `Layout added: ${name.trim()}.` } });
    } catch (err: any) {
      setError(String(err?.message || "Failed to add layout"));
    } finally {
      setBusy(false);
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
        <h2>Add New Layout</h2>
        <div className="form">
          <div className="row4">
            <label>
              Layout Name
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Number of Holes
              <select
                className="numInput"
                value={numholes}
                onChange={(e) => setNumholes(e.target.value)}
              >
                <option value="9">9</option>
                <option value="18">18</option>
              </select>
            </label>
            <label>
              Starting Hole
              <input
                className="numInput"
                value={startinghole}
                onChange={(e) => setStartinghole(e.target.value)}
              />
            </label>
            <label>
              Slope Rating
              <input
                className="numInput"
                value={sloperating}
                onChange={(e) => setSloperating(e.target.value)}
              />
            </label>
            <label>
              Course Rating
              <input
                className="numInput"
                value={courserating}
                onChange={(e) => setCourserating(e.target.value)}
              />
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
              <input
                className="numInput"
                value={holes[n]}
                onChange={(e) => setHole(n, e.target.value)}
                tabIndex={idx + 1}
              />
              <input
                className="numInput"
                value={handicapHoles[n]}
                onChange={(e) => setHdcp(n, e.target.value)}
                tabIndex={visibleHoleNums.length + idx + 1}
              />
            </div>
          ))}

          <div className="actions">
            <button className="btn primary" onClick={submit} disabled={busy}>
              {busy ? "Adding…" : "Add Layout"}
            </button>
          </div>
        </div>
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
        .actions { margin-top: 8px; }
        .btn { border: 1px solid #d1d5db; background: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; }
        .btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .alert { padding: 10px 12px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; color: #991b1b; }
      `}</style>
    </div>
  );
}
