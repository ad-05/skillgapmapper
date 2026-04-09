import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getRoles, submitAssess } from "../auth";
import { Spinner, Alert, RoleCard, AccessDenied } from "../components";
import { useAuth } from "../auth";
import SKILL_ANCHORS from "../skillAnchors";

// ── Proficiency levels ─────────────────────────────────────────────────────
const LEVELS = [
  { label: "None",         value: 0,  color: "#585b70", bg: "#585b7022" },
  { label: "Beginner",     value: 3,  color: "#FF6584", bg: "#FF658422" },
  { label: "Intermediate", value: 6,  color: "#F7971E", bg: "#F7971E22" },
  { label: "Advanced",     value: 8,  color: "#89b4fa", bg: "#89b4fa22" },
  { label: "Expert",       value: 10, color: "#43C6AC", bg: "#43C6AC22" },
];

const levelKey = { 0: null, 3: "beginner", 6: "intermediate", 8: "advanced", 10: "expert" };

function getLevelObj(v) {
  return LEVELS.find(l => l.value === v) || LEVELS[0];
}

// ── Single skill card with behavioral anchor ───────────────────────────────
function SkillCard({ skill, value, onChange }) {
  const current  = getLevelObj(value);
  const anchors  = SKILL_ANCHORS[skill];
  const anchorText = anchors && levelKey[value] ? anchors[levelKey[value]] : null;

  return (
    <div style={{
      background: "var(--bg)",
      border: `1px solid ${value > 0 ? current.color + "55" : "var(--overlay)"}`,
      borderRadius: 14,
      padding: "18px 20px",
      transition: "border-color .2s, box-shadow .2s",
      boxShadow: value > 0 ? `0 0 0 1px ${current.color}22` : "none",
    }}>

      {/* Header: skill name + badge */}
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{skill}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, color: current.color,
          background: current.bg, padding: "3px 10px", borderRadius: 20,
          transition: "all .2s"
        }}>
          {current.label}
        </span>
      </div>

      {/* Level selector buttons */}
      <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
        {LEVELS.map(l => (
          <button
            key={l.value}
            onClick={() => onChange(l.value)}
            title={l.label}
            style={{
              flex: 1, padding: "9px 4px",
              borderRadius: 8,
              border: `2px solid ${value === l.value ? l.color : "var(--overlay)"}`,
              background: value === l.value ? l.bg : "transparent",
              color: value === l.value ? l.color : "var(--comment)",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Space Grotesk', sans-serif",
              transition: "all .15s",
            }}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Behavioral anchor — the key addition */}
      <div style={{
        minHeight: 40,
        padding: anchorText ? "10px 14px" : "0",
        background: anchorText ? current.bg : "transparent",
        borderRadius: 8,
        borderLeft: anchorText ? `3px solid ${current.color}` : "none",
        transition: "all .25s",
      }}>
        {anchorText ? (
          <p style={{ fontSize: 12, color: current.color, lineHeight: 1.6, margin: 0 }}>
            <strong>What this looks like:</strong> {anchorText}
          </p>
        ) : (
          <p style={{ fontSize: 12, color: "var(--comment)", margin: 0, fontStyle: "italic" }}>
            Select a level to see what it means for this skill.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────
function Progress({ skills, total }) {
  const rated = Object.values(skills).filter(v => v > 0).length;
  const pct   = total > 0 ? Math.round((rated / total) * 100) : 0;
  const color = pct === 100 ? "#43C6AC" : pct > 50 ? "#F7971E" : "var(--purple)";
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between",
        fontSize: 13, marginBottom: 8 }}>
        <span style={{ color: "var(--sub)" }}>
          {rated} / {total} skills rated
        </span>
        <span style={{ color, fontWeight: 700 }}>
          {pct === 100 ? "✅ All rated!" : `${pct}% complete`}
        </span>
      </div>
      <div style={{ height: 6, background: "var(--overlay)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg, var(--purple), ${color})`,
          borderRadius: 3, transition: "width .4s ease",
        }}/>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Assess() {
  const { user }  = useAuth();
  const nav       = useNavigate();
  const loc       = useLocation();

  const [roles, setRoles]           = useState([]);
  const [selected, setSelected]     = useState(null);
  const [skills, setSkills]         = useState({});
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    getRoles().then(r => {
      const list = r.data.roles;
      setRoles(list);
      if (loc.state?.preselect) {
        const found = list.find(x => x.role_name === loc.state.preselect);
        if (found) pick(found, loc.state?.prefill || {});
      }
      setLoading(false);
    });
  }, []);

  if (user?.role !== "learner")
    return <AccessDenied message="Only Learners can take assessments." />;

  const pick = (role, prefill = {}) => {
    setSelected(role);
    setError("");
    const init = {};
    Object.entries(role.skills).forEach(([k, v]) => {
      if (v > 0) init[k] = prefill[k] || 0;
    });
    setSkills(init);
  };

  const handleSubmit = async () => {
    if (!selected) return setError("Please select a career role.");
    if (Object.values(skills).every(v => v === 0))
      return setError("Please rate at least one skill before submitting.");
    setError("");
    setSubmitting(true);
    try {
      const res = await submitAssess({ target_role: selected.role_name, skills });
      nav("/results", { state: { result: res.data, role: selected, skills } });
    } catch (e) {
      setError(e.response?.data?.error || "Submission failed. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  };

  const activeSkills = selected
    ? Object.entries(selected.skills).filter(([, v]) => v > 0).map(([k]) => k)
    : [];

  const ratedCount = Object.values(skills).filter(v => v > 0).length;

  if (loading)
    return <div className="page" style={{ textAlign: "center", paddingTop: 80 }}><Spinner /></div>;

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Skill Assessment</h1>
        <p style={{ color: "var(--sub)", marginBottom: 32 }}>
          Select a target role, then rate your proficiency. Each level shows a concrete example
          of what that skill looks like in practice — inspired by the{" "}
          <strong style={{ color: "var(--purple)" }}>SFIA framework</strong>.
        </p>

        {loc.state?.prefill && Object.keys(loc.state.prefill).length > 0 && (
          <Alert type="success">
            ✅ Skills pre-filled from your resume — review and adjust before submitting.
          </Alert>
        )}
        {error && <Alert type="error">{error}</Alert>}

        {/* Step 1 — Role selection */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-title" style={{ fontSize: 16, marginBottom: 16 }}>
            Step 1 — Choose Target Career Role
          </div>
          <div className="grid-roles">
            {roles.map(r => (
              <RoleCard key={r.id} role={r}
                selected={selected?.id === r.id}
                onClick={() => pick(r)} />
            ))}
          </div>
        </div>

        {/* Step 2 — Skill rating */}
        {selected && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start",
              justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
              <div>
                <div className="section-title" style={{ fontSize: 16, marginBottom: 4 }}>
                  Step 2 — Rate Your Skills for{" "}
                  <span style={{ color: selected.color }}>{selected.role_name}</span>
                </div>
                <p style={{ color: "var(--sub)", fontSize: 13 }}>
                  Select your level for each skill. The anchor text explains exactly what each level means.
                </p>
              </div>
              <button className="btn btn-ghost"
                style={{ fontSize: 12, padding: "7px 14px", alignSelf: "flex-start" }}
                onClick={() => {
                  const reset = {};
                  activeSkills.forEach(s => reset[s] = 0);
                  setSkills(reset);
                }}>
                Reset All
              </button>
            </div>

            {/* Level legend */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap",
              padding: "12px 16px", background: "var(--bg)", borderRadius: 10, marginBottom: 24 }}>
              {LEVELS.filter(l => l.value > 0).map(l => (
                <span key={l.value} className="tag"
                  style={{ background: l.bg, color: l.color, fontSize: 12, padding: "4px 12px" }}>
                  {l.label} = {l.value}/10
                </span>
              ))}
              <span style={{ fontSize: 12, color: "var(--comment)", alignSelf: "center",
                marginLeft: 4 }}>
                · Select any level to see what it means for that specific skill
              </span>
            </div>

            <Progress skills={skills} total={activeSkills.length} />

            <div style={{ display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
              {activeSkills.map(s => (
                <SkillCard
                  key={s}
                  skill={s}
                  value={skills[s] ?? 0}
                  onChange={v => setSkills(p => ({ ...p, [s]: v }))}
                />
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          className="btn btn-primary btn-full"
          style={{ fontSize: 15, padding: "14px" }}
          onClick={handleSubmit}
          disabled={submitting || !selected || ratedCount === 0}>
          {submitting
            ? <><Spinner size={18} /> Analyzing with AI...</>
            : `🔍 Analyze My Skills${ratedCount > 0 ? `  (${ratedCount} / ${activeSkills.length} rated)` : ""}`
          }
        </button>
      </div>
    </div>
  );
}
