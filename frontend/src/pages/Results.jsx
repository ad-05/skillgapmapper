import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { RadialProgress, SkillBar, ScoreBadge, Spinner } from "../components";
import { api } from "../auth";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

// ── Helpers ────────────────────────────────────────────────────────────────
const sc = s => s >= 75 ? "#43C6AC" : s >= 50 ? "#F7971E" : "#FF6584";
const cc = v => v >= 0 ? "#43C6AC" : "#FF6584";

// ── Confidence gauge ───────────────────────────────────────────────────────
function ConfidenceGauge({ value, label }) {
  const color = value >= 65 ? "#43C6AC" : value >= 45 ? "#F7971E" : "#FF6584";
  const r = 54, circ = 2 * Math.PI * r;
  const dash = (Math.min(value, 100) / 100) * circ;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={140} height={140} viewBox="0 0 140 140">
        <circle cx={70} cy={70} r={r} fill="none" stroke="#1e1e2e" strokeWidth={12}/>
        <circle cx={70} cy={70} r={r} fill="none" stroke={color} strokeWidth={12}
          strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }}/>
        <text x={70} y={65} textAnchor="middle" fill="white"
          fontSize={22} fontWeight={800} fontFamily="'Space Grotesk',sans-serif">
          {Math.round(value)}%
        </text>
        <text x={70} y={85} textAnchor="middle" fill="#a6adc8"
          fontSize={11} fontFamily="'Space Grotesk',sans-serif">
          RF Confidence
        </text>
      </svg>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ── SHAP-style contribution bar chart ─────────────────────────────────────
function ContributionChart({ contributions }) {
  if (!contributions?.length) return (
    <div style={{ color: "var(--sub)", fontSize: 13, textAlign: "center", padding: 20 }}>
      No contribution data available.
    </div>
  );

  const data = [...contributions]
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 10)
    .map(c => ({
      skill: c.skill,
      value: parseFloat((c.contribution * 100).toFixed(2)),
      level: c.user_level,
    }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--overlay)",
        borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.skill}</div>
        <div style={{ color: d.value >= 0 ? "#43C6AC" : "#FF6584" }}>
          {d.value >= 0 ? "+" : ""}{d.value}% confidence
        </div>
        <div style={{ color: "var(--comment)", fontSize: 11 }}>Your level: {d.level}/10</div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 40 }}>
        <XAxis type="number" tick={{ fill: "#585b70", fontSize: 11 }}
          tickFormatter={v => `${v > 0 ? "+" : ""}${v}%`}/>
        <YAxis type="category" dataKey="skill" width={130}
          tick={{ fill: "#a6adc8", fontSize: 12 }}/>
        <Tooltip content={<CustomTooltip />}/>
        <ReferenceLine x={0} stroke="#45475a" strokeWidth={1}/>
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.value >= 0 ? "#43C6AC" : "#FF6584"}/>
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Radar chart for skill profile ─────────────────────────────────────────
function SkillRadar({ skills, roleSkills, color }) {
  const keys = Object.keys(roleSkills || {})
    .filter(k => (roleSkills[k] || 0) > 0)
    .slice(0, 8);
  if (!keys.length) return null;

  const data = keys.map(k => ({
    skill: k.length > 12 ? k.substring(0, 12) + "…" : k,
    yours: skills?.[k] || 0,
    required: roleSkills[k] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data}>
        <PolarGrid stroke="#313244"/>
        <PolarAngleAxis dataKey="skill" tick={{ fill: "#a6adc8", fontSize: 11 }}/>
        <PolarRadiusAxis domain={[0, 10]} tick={{ fill: "#585b70", fontSize: 9 }}/>
        <Radar name="Required" dataKey="required" stroke="#45475a"
          fill="#45475a" fillOpacity={0.3}/>
        <Radar name="Yours" dataKey="yours" stroke={color || "#cba6f7"}
          fill={color || "#cba6f7"} fillOpacity={0.5}/>
        <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid #313244",
          borderRadius: 8, color: "#cdd6f4", fontSize: 13 }}/>
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Model info badge ───────────────────────────────────────────────────────
function ModelBadge({ metrics }) {
  if (!metrics) return null;
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
      {[
        { label: "Accuracy", value: `${(metrics.accuracy * 100).toFixed(1)}%` },
        { label: "F1 Score", value: metrics.f1_score?.toFixed(3) },
        { label: "ROC-AUC",  value: metrics.roc_auc?.toFixed(3) },
        { label: "CV F1",    value: metrics.cv_f1_mean?.toFixed(3) },
      ].map(m => (
        <div key={m.label} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--purple)" }}>{m.value}</div>
          <div style={{ fontSize: 10, color: "var(--comment)", textTransform: "uppercase",
            letterSpacing: ".05em" }}>{m.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main Results page ──────────────────────────────────────────────────────
export default function Results() {
  const nav = useNavigate();
  const loc = useLocation();

  const [mlData, setMlData]       = useState(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError]     = useState("");
  const [aiText, setAiText]       = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiShown, setAiShown]     = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const { result, role, skills } = loc.state || {};

  useEffect(() => {
    if (!result) { nav("/assess"); return; }
    // Auto-fetch ML prediction on load
    fetchML();
  }, []);

  if (!result) return null;

  const { score, gaps, strengths } = result;
  const scoreColor = sc(score);
  const activeSkills = role
    ? Object.entries(role.skills).filter(([, v]) => v > 0)
    : [];

  const fetchML = async () => {
    setMlLoading(true);
    setMlError("");
    try {
      const res = await api.post("/api/ml/predict", {
        target_role: role?.role_name,
        skills,
      });
      setMlData(res.data);
    } catch (e) {
      setMlError("ML model unavailable. Run python train_model.py on the backend.");
    } finally {
      setMlLoading(false);
    }
  };

  const fetchAI = async () => {
    setAiShown(true);
    setAiLoading(true);
    try {
      const res = await api.post("/api/ai-insights", {
        target_role: role?.role_name,
        score,
        gaps:      gaps.slice(0, 5),
        strengths: strengths.slice(0, 4),
      });
      setAiText(res.data.text || "");
    } catch {
      setAiText(
        `1. Focus on "${gaps[0]?.skill || "your top gap"}" — build a hands-on project using it.\n\n` +
        `2. Take a structured course on your top 2 gaps via Coursera or Udemy.\n\n` +
        `3. Showcase your strengths in a GitHub portfolio.`
      );
    } finally {
      setAiLoading(false);
    }
  };

  const tabs = [
    { id: "overview",   label: "📊 Overview" },
    { id: "ml",         label: "🤖 ML Analysis" },
    { id: "explain",    label: "🔍 Explainability" },
    { id: "skills",     label: "📈 Skill Breakdown" },
  ];

  return (
    <div className="page">
      <div className="container">

        {/* Nav */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          <button className="btn btn-secondary" style={{ fontSize: 13, padding: "8px 16px" }}
            onClick={() => nav("/assess")}>← New Assessment</button>
          <button className="btn btn-ghost" style={{ fontSize: 13, padding: "8px 16px" }}
            onClick={() => nav("/history")}>📋 My History</button>
        </div>

        <h1 className="page-title" style={{ fontSize: 28 }}>Assessment Results</h1>
        <p style={{ color: "var(--sub)", marginBottom: 24 }}>
          Target: <strong style={{ color: "var(--text)" }}>{role?.role_name}</strong>
          {mlData && (
            <span style={{ marginLeft: 12, fontSize: 13, color: "var(--comment)" }}>
              · Random Forest model trained on 6,000 synthetic profiles
            </span>
          )}
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button key={t.id}
              className={`btn ${activeTab === t.id ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: 13, padding: "8px 18px" }}
              onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <>
            <div className="grid-2" style={{ marginBottom: 24 }}>

              {/* Cosine score card */}
              <div className="card" style={{ textAlign: "center",
                borderTop: `3px solid ${scoreColor}` }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{role?.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: role?.color,
                  marginBottom: 20 }}>{role?.role_name}</div>
                <div style={{ fontSize: 11, color: "var(--comment)", marginBottom: 8,
                  textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Cosine Similarity Score
                </div>
                <RadialProgress value={score} color={scoreColor} size={150}/>
                <div style={{ marginTop: 16 }}>
                  <ScoreBadge score={score}/>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 14,
                  justifyContent: "center" }}>
                  <span className="tag" style={{ background: "#43C6AC22", color: "#43C6AC" }}>
                    {strengths.length} Strong
                  </span>
                  <span className="tag" style={{ background: "#FF658422", color: "#FF6584" }}>
                    {gaps.length} Gaps
                  </span>
                </div>
              </div>

              {/* RF prediction card */}
              <div className="card" style={{ borderTop: "3px solid var(--purple)" }}>
                <div style={{ fontSize: 11, color: "var(--comment)", marginBottom: 12,
                  textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Random Forest Classifier
                </div>

                {mlLoading ? (
                  <div style={{ textAlign: "center", padding: "40px 0" }}><Spinner/></div>
                ) : mlError ? (
                  <div style={{ color: "var(--red)", fontSize: 13, padding: 16,
                    background: "#FF658411", borderRadius: 8 }}>⚠️ {mlError}</div>
                ) : mlData ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-around",
                      alignItems: "center", marginBottom: 20 }}>
                      <ConfidenceGauge
                        value={mlData.rf_confidence}
                        label={mlData.rf_label}/>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "var(--comment)",
                          marginBottom: 8, textTransform: "uppercase",
                          letterSpacing: ".06em" }}>Learner Persona</div>
                        <div style={{ fontSize: 32, marginBottom: 4 }}>
                          {mlData.persona?.name?.includes("Expert") ? "🏆" :
                           mlData.persona?.name?.includes("Ready") ? "💪" :
                           mlData.persona?.name?.includes("Generalist") ? "🌐" : "🌱"}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14,
                          color: "var(--purple)" }}>
                          {mlData.persona?.name}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--sub)", marginTop: 4 }}>
                          {mlData.persona?.ready_pct}% of similar learners are job-ready
                        </div>
                      </div>
                    </div>

                    {/* Cosine vs RF comparison */}
                    <div style={{ background: "var(--bg)", borderRadius: 10,
                      padding: "14px 18px", marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sub)",
                        marginBottom: 10, textTransform: "uppercase",
                        letterSpacing: ".05em" }}>
                        Model Comparison
                      </div>
                      <div style={{ display: "flex", gap: 24 }}>
                        <div>
                          <div style={{ fontSize: 22, fontWeight: 800,
                            color: scoreColor }}>{score}%</div>
                          <div style={{ fontSize: 11, color: "var(--comment)" }}>
                            Cosine Similarity
                          </div>
                        </div>
                        <div style={{ borderLeft: "1px solid var(--overlay)",
                          paddingLeft: 24 }}>
                          <div style={{ fontSize: 22, fontWeight: 800,
                            color: cc(mlData.rf_confidence - 50) }}>
                            {mlData.rf_confidence}%
                          </div>
                          <div style={{ fontSize: 11, color: "var(--comment)" }}>
                            RF Confidence
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--comment)", marginTop: 10 }}>
                        {Math.abs(score - mlData.rf_confidence) < 10
                          ? "✅ Both models agree on your readiness level."
                          : mlData.rf_confidence > score
                          ? "🤖 The RF model rates you higher — your skill combination is strong for this role."
                          : "📊 Cosine similarity rates you higher — consider improving key skills the RF found weak."}
                      </div>
                    </div>

                    {/* Model quality */}
                    <div style={{ borderTop: "1px solid var(--overlay)", paddingTop: 12 }}>
                      <div style={{ fontSize: 11, color: "var(--comment)", marginBottom: 4,
                        textTransform: "uppercase", letterSpacing: ".05em" }}>
                        Model Quality (trained on 6,000 profiles)
                      </div>
                      <ModelBadge metrics={mlData.model_metrics}/>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* Radar chart */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="section-title" style={{ fontSize: 15, marginBottom: 4 }}>
                🕸️ Skill Profile Radar
              </div>
              <p style={{ color: "var(--sub)", fontSize: 13, marginBottom: 16 }}>
                Your skills (purple) vs what the role requires (grey). Larger area = better fit.
              </p>
              <SkillRadar
                skills={skills}
                roleSkills={role?.skills}
                color={role?.color || "#cba6f7"}/>
            </div>

            {/* Top gaps */}
            {gaps.length > 0 && (
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="section-title" style={{ fontSize: 15, marginBottom: 14 }}>
                  🎯 Priority Gaps
                </div>
                <div style={{ display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
                  {gaps.slice(0, 6).map(g => (
                    <div key={g.skill} style={{ background: "#FF658411",
                      border: "1px solid #FF658433", borderRadius: 10,
                      padding: "14px 16px" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#FF6584" }}>
                        {g.skill}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--sub)", marginTop: 4 }}>
                        You: {g.user_level} / Need: {g.required}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#FF6584",
                        marginTop: 4 }}>
                        +{g.deficit} levels needed
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths */}
            {strengths.length > 0 && (
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="section-title" style={{ fontSize: 15, marginBottom: 12 }}>
                  ✅ Your Strengths
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {strengths.map(s => (
                    <span key={s.skill} className="tag"
                      style={{ background: "#43C6AC22", color: "#43C6AC",
                        padding: "6px 14px", fontSize: 13 }}>
                      {s.skill} ({s.user_level}/10)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* AI recommendations */}
            <div className="card">
              <div style={{ display: "flex", alignItems: "center",
                justifyContent: "space-between", flexWrap: "wrap", gap: 12,
                marginBottom: aiShown ? 20 : 0 }}>
                <div>
                  <div className="section-title" style={{ fontSize: 15, marginBottom: 4 }}>
                    💡 Personalised Recommendations
                  </div>
                  {!aiShown && (
                    <div style={{ fontSize: 13, color: "var(--sub)" }}>
                      Get AI-generated, actionable next steps
                    </div>
                  )}
                </div>
                {!aiShown && (
                  <button className="btn btn-primary" onClick={fetchAI}>
                    ✨ Generate Recommendations
                  </button>
                )}
              </div>
              {aiShown && (
                aiLoading
                  ? <div style={{ textAlign: "center", padding: 24 }}><Spinner/></div>
                  : <div style={{ background: "var(--bg)", borderRadius: 10,
                      padding: 20, fontSize: 14, lineHeight: 1.9,
                      color: "var(--text)", whiteSpace: "pre-wrap" }}>
                      {aiText}
                    </div>
              )}
            </div>
          </>
        )}

        {/* ── ML ANALYSIS TAB ── */}
        {activeTab === "ml" && (
          <>
            {mlLoading ? (
              <div style={{ textAlign: "center", padding: 60 }}><Spinner size={40}/></div>
            ) : mlData ? (
              <>
                <div className="grid-2" style={{ marginBottom: 24 }}>
                  {/* Prediction summary */}
                  <div className="card">
                    <div className="section-title" style={{ fontSize: 15, marginBottom: 20 }}>
                      🌲 Random Forest Prediction
                    </div>
                    <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
                      <ConfidenceGauge
                        value={mlData.rf_confidence}
                        label={mlData.rf_label}/>
                    </div>
                    <div style={{ background: "var(--bg)", borderRadius: 10, padding: 16,
                      fontSize: 13, lineHeight: 1.8 }}>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: "var(--sub)" }}>Prediction: </span>
                        <strong style={{ color: mlData.rf_prediction === 1 ? "#43C6AC" : "#FF6584" }}>
                          {mlData.rf_prediction === 1 ? "Job Ready" : "Not Yet Ready"}
                        </strong>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: "var(--sub)" }}>Confidence: </span>
                        <strong style={{ color: "var(--purple)" }}>
                          {mlData.rf_confidence}%
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--sub)" }}>Algorithm: </span>
                        <strong>Random Forest (200 trees, depth 12)</strong>
                      </div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sub)",
                        textTransform: "uppercase", letterSpacing: ".05em",
                        marginBottom: 10 }}>Model Performance Metrics</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
                        gap: 10 }}>
                        {[
                          { label: "Accuracy",    val: `${(mlData.model_metrics.accuracy * 100).toFixed(1)}%` },
                          { label: "F1 Score",    val: mlData.model_metrics.f1_score?.toFixed(3) },
                          { label: "ROC-AUC",     val: mlData.model_metrics.roc_auc?.toFixed(3) },
                          { label: "5-Fold CV F1",val: mlData.model_metrics.cv_f1_mean?.toFixed(3) },
                        ].map(m => (
                          <div key={m.label} style={{ background: "var(--surface)",
                            border: "1px solid var(--overlay)", borderRadius: 8,
                            padding: "10px 14px" }}>
                            <div style={{ fontSize: 18, fontWeight: 800,
                              color: "var(--purple)" }}>{m.val}</div>
                            <div style={{ fontSize: 11, color: "var(--comment)" }}>
                              {m.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Persona card */}
                  <div className="card">
                    <div className="section-title" style={{ fontSize: 15, marginBottom: 20 }}>
                      👤 Learner Persona (K-Means Clustering)
                    </div>
                    <div style={{ textAlign: "center", padding: "10px 0 16px" }}>
                      <div style={{ fontSize: 48, marginBottom: 8 }}>
                        {mlData.persona?.name?.includes("Expert") ? "🏆" :
                         mlData.persona?.name?.includes("Ready") ? "💪" :
                         mlData.persona?.name?.includes("Generalist") ? "🌐" : "🌱"}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800,
                        color: "var(--purple)", marginBottom: 4 }}>
                        {mlData.persona?.name}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--sub)" }}>
                        K-Means cluster assignment (k=4)
                      </div>
                    </div>
                    <div style={{ background: "var(--bg)", borderRadius: 10,
                      padding: 16, fontSize: 13, lineHeight: 1.9 }}>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: "var(--sub)" }}>Peers who are ready: </span>
                        <strong style={{ color: "var(--teal)" }}>
                          {mlData.persona?.ready_pct}%
                        </strong>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: "var(--sub)" }}>Top skills in cluster: </span>
                        <strong>{mlData.persona?.top_skills?.join(", ")}</strong>
                      </div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sub)",
                        textTransform: "uppercase", letterSpacing: ".05em",
                        marginBottom: 10 }}>What this means</div>
                      <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7,
                        background: "var(--bg)", borderRadius: 8, padding: 14,
                        borderLeft: "3px solid var(--purple)" }}>
                        {mlData.persona?.ready_pct >= 70
                          ? "You're in a cluster where most learners are successfully transitioning into the role. You're on the right track."
                          : mlData.persona?.ready_pct >= 40
                          ? "You're in a cluster of developing learners. Focused practice on your top gaps will move you to the ready cluster."
                          : "You're early in your journey. Start with foundational skills and reassess — consistent improvement is the key signal the model looks for."}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Global feature importance */}
                <div className="card">
                  <div className="section-title" style={{ fontSize: 15, marginBottom: 4 }}>
                    📊 Global Feature Importance
                  </div>
                  <p style={{ color: "var(--sub)", fontSize: 13, marginBottom: 20 }}>
                    Which of your rated skills the model considers most important for this prediction,
                    based on MDI + permutation importance from training.
                  </p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={mlData.global_importance?.map(f => ({
                        skill: f.skill, value: parseFloat((f.importance * 100).toFixed(1))
                      }))}
                      margin={{ left: -10 }}>
                      <XAxis dataKey="skill" tick={{ fill: "#585b70", fontSize: 11 }}/>
                      <YAxis tick={{ fill: "#585b70", fontSize: 11 }}
                        tickFormatter={v => `${v}%`}/>
                      <Tooltip
                        contentStyle={{ background: "#1e1e2e", border: "1px solid #313244",
                          borderRadius: 8, color: "#cdd6f4" }}
                        formatter={v => [`${v}%`, "Importance"]}/>
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {(mlData.global_importance || []).map((_, i) => (
                          <Cell key={i}
                            fill={["#cba6f7","#43C6AC","#89b4fa","#F7971E","#FF6584",
                                   "#ec4899","#a6e3a1","#f9e2af"][i % 8]}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : mlError ? (
              <div className="card" style={{ textAlign: "center", padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                <div style={{ color: "var(--red)", fontSize: 14 }}>{mlError}</div>
              </div>
            ) : null}
          </>
        )}

        {/* ── EXPLAINABILITY TAB ── */}
        {activeTab === "explain" && (
          <>
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="section-title" style={{ fontSize: 15, marginBottom: 4 }}>
                🔍 Skill Contribution Analysis
              </div>
              <p style={{ color: "var(--sub)", fontSize: 13, marginBottom: 20 }}>
                For each skill you rated, this shows how much it <em>increases</em> (green) or
                <em> decreases</em> (red) the model's confidence in your job readiness.
                Computed by zeroing out each skill and measuring the probability drop —
                equivalent to SHAP marginal contribution.
              </p>
              {mlLoading ? (
                <div style={{ textAlign: "center", padding: 40 }}><Spinner/></div>
              ) : mlData?.feature_contributions?.length ? (
                <ContributionChart contributions={mlData.feature_contributions}/>
              ) : (
                <div style={{ color: "var(--sub)", fontSize: 13, textAlign: "center",
                  padding: 30 }}>
                  {mlError || "No contribution data — rate more skills to see this analysis."}
                </div>
              )}
            </div>

            <div className="card">
              <div className="section-title" style={{ fontSize: 15, marginBottom: 4 }}>
                📋 Contribution Table
              </div>
              <p style={{ color: "var(--sub)", fontSize: 13, marginBottom: 16 }}>
                Detailed breakdown of each skill's impact on the prediction.
              </p>
              {mlData?.feature_contributions?.length ? (
                <div className="table-wrap">
                  <table>
                    <thead><tr>
                      <th>Skill</th>
                      <th>Your Level</th>
                      <th>Contribution</th>
                      <th>Impact</th>
                    </tr></thead>
                    <tbody>
                      {mlData.feature_contributions.map(c => (
                        <tr key={c.skill}>
                          <td style={{ fontWeight: 600 }}>{c.skill}</td>
                          <td>{c.user_level}/10</td>
                          <td style={{
                            fontWeight: 700,
                            color: c.contribution >= 0 ? "#43C6AC" : "#FF6584"
                          }}>
                            {c.contribution >= 0 ? "+" : ""}
                            {(c.contribution * 100).toFixed(2)}%
                          </td>
                          <td>
                            <span className="tag" style={{
                              background: c.contribution >= 0 ? "#43C6AC22" : "#FF658422",
                              color: c.contribution >= 0 ? "#43C6AC" : "#FF6584",
                              fontSize: 11,
                            }}>
                              {c.contribution >= 0 ? "✅ Helps" : "⚠️ Hurts"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ color: "var(--sub)", fontSize: 13 }}>
                  No data available yet.
                </div>
              )}
            </div>
          </>
        )}

        {/* ── SKILL BREAKDOWN TAB ── */}
        {activeTab === "skills" && (
          <div className="card">
            <div className="section-title" style={{ fontSize: 15, marginBottom: 4 }}>
              📈 Full Skill Breakdown
            </div>
            <p style={{ color: "var(--sub)", fontSize: 13, marginBottom: 20 }}>
              Your level (coloured bar) vs what the role requires (grey background).
              Green = meets requirement, orange = close, red = significant gap.
            </p>
            <div style={{ display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "10px 32px" }}>
              {activeSkills.map(([s, req]) => (
                <SkillBar key={s} skill={s}
                  userLevel={skills?.[s] || 0} required={req}/>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
          <button className="btn btn-primary" style={{ flex: 1 }}
            onClick={() => nav("/assess")}>🔄 New Assessment</button>
          <button className="btn btn-secondary" style={{ flex: 1 }}
            onClick={() => nav("/")}>🏠 Home</button>
        </div>
      </div>
    </div>
  );
}
