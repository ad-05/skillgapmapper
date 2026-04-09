import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, parseResume, getAllRoleFits, getRoles } from "../auth";
import { Spinner, Alert, AccessDenied, RadialProgress } from "../components";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

const LEVEL_LABELS = { 0:"None", 3:"Beginner", 6:"Intermediate", 8:"Advanced", 10:"Expert" };
const LEVEL_COLORS = { 0:"#585b70", 3:"#FF6584", 6:"#F7971E", 8:"#89b4fa", 10:"#43C6AC" };
const ROLE_COLORS  = ["#cba6f7","#43C6AC","#89b4fa","#F7971E","#FF6584","#ec4899"];
const sc = s => s >= 75 ? "#43C6AC" : s >= 50 ? "#F7971E" : "#FF6584";

// ── Upload zone ──────────────────────────────────────────────────────────────
function UploadZone({ onFile, loading }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();

  const handle = (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf","docx","doc","txt"].includes(ext)) {
      alert("Please upload a PDF, DOCX, or TXT file.");
      return;
    }
    onFile(file);
  };

  return (
    <div
      onClick={() => !loading && ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      style={{
        border: `2px dashed ${drag ? "var(--purple)" : "var(--overlay)"}`,
        borderRadius: 16, padding: "48px 24px", textAlign: "center",
        cursor: loading ? "not-allowed" : "pointer", transition: "all .2s",
        background: drag ? "var(--purple)11" : "var(--bg)",
      }}>
      <input ref={ref} type="file" accept=".pdf,.docx,.doc,.txt"
        style={{ display:"none" }} onChange={e => handle(e.target.files[0])}/>
      {loading ? (
        <><Spinner size={36}/><div style={{marginTop:16,color:"var(--sub)"}}>Analysing your resume…</div></>
      ) : (
        <>
          <div style={{ fontSize:48, marginBottom:12 }}>📄</div>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>
            Drop your resume here
          </div>
          <div style={{ color:"var(--sub)", fontSize:14, marginBottom:16 }}>
            or click to browse — PDF, DOCX, or TXT · max 5MB
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
            {["PDF","DOCX","TXT"].map(t => (
              <span key={t} className="tag"
                style={{ background:"var(--overlay)", color:"var(--sub)", fontSize:12 }}>
                {t}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Skill level pill ─────────────────────────────────────────────────────────
function LevelPill({ level, confidence }) {
  const color = LEVEL_COLORS[level] || "#585b70";
  const label = LEVEL_LABELS[level] || "Unknown";
  return (
    <span className="tag" style={{ background: color+"22", color, fontSize:11,
      padding:"2px 10px", display:"inline-flex", alignItems:"center", gap:6 }}>
      {label}
      {confidence !== undefined && (
        <span style={{ opacity:.7, fontSize:10 }}>{Math.round(confidence*100)}%</span>
      )}
    </span>
  );
}

// ── Role fit card ────────────────────────────────────────────────────────────
function RoleFitCard({ fit, rank, onClick, selected }) {
  const color = sc(fit.fit_score);
  return (
    <div onClick={onClick} className="card" style={{
      cursor:"pointer", transition:"all .2s",
      borderLeft: `4px solid ${selected ? color : "var(--overlay)"}`,
      background: selected ? color+"11" : "var(--surface)",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ fontSize:20, fontWeight:800, color:"var(--comment)",
          width:28, flexShrink:0 }}>#{rank}</div>
        <RadialProgress value={fit.fit_score} color={color} size={64}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>
            {fit.role_name}
          </div>
          <div style={{ fontSize:12, color, fontWeight:700, marginBottom:4 }}>
            {fit.fit_label}
          </div>
          <div style={{ fontSize:11, color:"var(--comment)" }}>
            {fit.covered_count}/{fit.required_count} skills covered
            · {fit.coverage_pct}% coverage
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Resume page ─────────────────────────────────────────────────────────
export default function Resume() {
  const { user }  = useAuth();
  const nav       = useNavigate();

  const [file, setFile]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [parsed, setParsed]       = useState(null);
  const [fits, setFits]           = useState(null);
  const [selectedFit, setSelectedFit] = useState(null);
  const [tab, setTab]             = useState("skills");
  const [editedSkills, setEditedSkills] = useState({});

  if (user?.role !== "learner")
    return <AccessDenied message="Only Learners can use the Resume Analyser."/>;

  const handleFile = async (f) => {
    setFile(f);
    setError("");
    setParsed(null);
    setFits(null);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await parseResume(fd);
      const data = res.data;
      setParsed(data);
      setEditedSkills({ ...data.extracted_skills });

      // Compute fit for all roles
      const fitRes = await getAllRoleFits(data.extracted_skills);
      const roleFits = fitRes.data.role_fits || [];
      setFits(roleFits);
      if (roleFits.length > 0) setSelectedFit(roleFits[0]);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to parse resume. Please try a different file.");
    } finally {
      setLoading(false);
    }
  };

  const goToAssess = () => {
    if (!selectedFit) return;
    nav("/assess", {
      state: {
        preselect: selectedFit.role_name,
        prefill:   editedSkills,
      }
    });
  };

  const LEVEL_OPTIONS = [
    { value: 0,  label: "None" },
    { value: 3,  label: "Beginner" },
    { value: 6,  label: "Intermediate" },
    { value: 8,  label: "Advanced" },
    { value: 10, label: "Expert" },
  ];

  // Radar data for selected fit
  const radarData = selectedFit
    ? Object.entries(selectedFit.fit_report_skills || {})
        .slice(0, 8)
        .map(([s, v]) => ({ skill: s.length > 12 ? s.slice(0,12)+"…" : s, value: v }))
    : [];

  const skillEntries = parsed
    ? Object.entries(editedSkills).sort((a,b) => b[1] - a[1])
    : [];

  return (
    <div className="page">
      <div className="container">

        {/* Header */}
        <div style={{ marginBottom:32 }}>
          <h1 className="page-title">Resume Analyser</h1>
          <p style={{ color:"var(--sub)", fontSize:16, maxWidth:600 }}>
            Upload your resume and we'll automatically extract your skills,
            estimate your proficiency levels using NLP, and tell you which
            career roles you're best suited for.
          </p>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {/* Upload */}
        {!parsed && (
          <div style={{ maxWidth:600, margin:"0 auto" }}>
            <UploadZone onFile={handleFile} loading={loading}/>
            <div style={{ marginTop:20, padding:"16px 20px",
              background:"var(--surface)", borderRadius:12,
              border:"1px solid var(--overlay)", fontSize:13 }}>
              <div style={{ fontWeight:700, marginBottom:8,
                color:"var(--purple)" }}>🔍 What the analyser does</div>
              <div style={{ color:"var(--sub)", lineHeight:1.8 }}>
                • Extracts text from your PDF or DOCX resume<br/>
                • Detects 44 technical and soft skills using NLP keyword matching<br/>
                • Estimates proficiency from context clues ("3 years of Python", "led ML projects")<br/>
                • Computes a Resume Fit Score against all 6 career roles<br/>
                • Pre-fills your skill assessment so you don't start from scratch
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {parsed && (
          <>
            {/* Summary bar */}
            <div className="card" style={{ marginBottom:24,
              borderTop:"3px solid var(--purple)" }}>
              <div style={{ display:"flex", alignItems:"center",
                gap:24, flexWrap:"wrap" }}>
                <div style={{ fontSize:32 }}>📄</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, fontSize:18, marginBottom:2 }}>
                    {file?.name}
                  </div>
                  <div style={{ color:"var(--sub)", fontSize:13 }}>
                    {parsed.word_count} words
                    {parsed.sections_found?.length > 0 &&
                      ` · Sections: ${parsed.sections_found.join(", ")}`}
                    {parsed.personal_info?.total_years &&
                      ` · ${parsed.personal_info.total_years} years experience`}
                  </div>
                </div>
                <div style={{ display:"flex", gap:20 }}>
                  {[
                    { label:"Skills Detected", value:parsed.detected_count, color:"var(--purple)" },
                    { label:"Best Role Fit",   value:`${fits?.[0]?.fit_score || 0}%`, color:"var(--teal)" },
                    { label:"Top Role",        value:fits?.[0]?.role_name?.split(" ")[0] || "–", color:"var(--blue)" },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign:"center" }}>
                      <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
                      <div style={{ fontSize:11, color:"var(--comment)" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-ghost" style={{ fontSize:13 }}
                  onClick={() => { setParsed(null); setFile(null); setFits(null); }}>
                  ↩ Upload Different Resume
                </button>
              </div>
            </div>

            {/* Personal info */}
            {Object.keys(parsed.personal_info || {}).length > 0 && (
              <div className="card" style={{ marginBottom:24,
                background:"var(--purple)11", border:"1px solid var(--purple)33" }}>
                <div style={{ fontSize:13, fontWeight:700,
                  color:"var(--purple)", marginBottom:8 }}>
                  👤 Contact Info Detected
                </div>
                <div style={{ display:"flex", gap:20, flexWrap:"wrap", fontSize:13,
                  color:"var(--sub)" }}>
                  {parsed.personal_info.email &&
                    <span>✉️ {parsed.personal_info.email}</span>}
                  {parsed.personal_info.linkedin &&
                    <span>💼 {parsed.personal_info.linkedin}</span>}
                  {parsed.personal_info.github &&
                    <span>🐙 {parsed.personal_info.github}</span>}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
              {[
                { id:"skills",  label:"🧠 Extracted Skills" },
                { id:"fit",     label:"🎯 Role Fit Analysis" },
                { id:"detail",  label:"🔍 Fit Detail" },
              ].map(t => (
                <button key={t.id}
                  className={`btn ${tab===t.id?"btn-primary":"btn-secondary"}`}
                  style={{ fontSize:13, padding:"8px 18px" }}
                  onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Skills tab ── */}
            {tab === "skills" && (
              <>
                <div className="card" style={{ marginBottom:20 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:12 }}>
                    <div>
                      <div className="section-title" style={{ fontSize:15, marginBottom:4 }}>
                        Skills Extracted from Resume
                      </div>
                      <p style={{ color:"var(--sub)", fontSize:13 }}>
                        Proficiency estimated from context. You can correct any level
                        before taking the assessment.
                      </p>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button className="btn btn-primary" style={{ fontSize:13 }}
                        onClick={goToAssess} disabled={!selectedFit}>
                        🚀 Go to Assessment (pre-filled)
                      </button>
                    </div>
                  </div>

                  {/* Level legend */}
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap",
                    padding:"10px 14px", background:"var(--bg)",
                    borderRadius:8, marginBottom:20, fontSize:12 }}>
                    {Object.entries(LEVEL_LABELS).filter(([v]) => v > 0).map(([v, l]) => (
                      <span key={v} className="tag"
                        style={{ background:LEVEL_COLORS[v]+"22",
                          color:LEVEL_COLORS[v], padding:"3px 10px" }}>
                        {l} = {v}/10
                      </span>
                    ))}
                  </div>

                  <div style={{ display:"grid",
                    gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",
                    gap:10 }}>
                    {skillEntries.map(([skill, level]) => (
                      <div key={skill} style={{
                        background:"var(--bg)", borderRadius:10,
                        padding:"12px 14px",
                        border:`1px solid ${LEVEL_COLORS[level] || "#45475a"}44`,
                      }}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"center", marginBottom:8 }}>
                          <span style={{ fontWeight:600, fontSize:13 }}>{skill}</span>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            {parsed.confidence_scores?.[skill] !== undefined && (
                              <span style={{ fontSize:10, color:"var(--comment)" }}>
                                {Math.round((parsed.confidence_scores[skill]||0)*100)}% conf
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Editable level selector */}
                        <div style={{ display:"flex", gap:4 }}>
                          {LEVEL_OPTIONS.map(o => (
                            <button key={o.value}
                              onClick={() => setEditedSkills(p => ({...p,[skill]:o.value}))}
                              style={{
                                flex:1, padding:"5px 2px", borderRadius:6,
                                border:`2px solid ${editedSkills[skill]===o.value
                                  ? LEVEL_COLORS[o.value] : "var(--overlay)"}`,
                                background: editedSkills[skill]===o.value
                                  ? LEVEL_COLORS[o.value]+"22" : "transparent",
                                color: editedSkills[skill]===o.value
                                  ? LEVEL_COLORS[o.value] : "var(--comment)",
                                fontSize:10, fontWeight:700, cursor:"pointer",
                                fontFamily:"'Space Grotesk',sans-serif",
                              }}>
                              {o.label.slice(0,4)}
                            </button>
                          ))}
                        </div>
                        {/* Evidence snippet */}
                        {parsed.skill_evidence?.[skill]?.[0] && (
                          <div style={{ fontSize:10, color:"var(--comment)",
                            marginTop:6, fontStyle:"italic",
                            borderLeft:"2px solid var(--overlay)",
                            paddingLeft:8, lineHeight:1.5 }}>
                            "…{parsed.skill_evidence[skill][0].slice(0,80)}…"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {skillEntries.length > 0 && (
                  <div className="card">
                    <div className="section-title" style={{ fontSize:15, marginBottom:16 }}>
                      Skill Level Distribution
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={Object.entries(
                          skillEntries.reduce((acc, [,v]) => {
                            const l = LEVEL_LABELS[v] || "Unknown";
                            acc[l] = (acc[l]||0) + 1;
                            return acc;
                          }, {})
                        ).map(([name, count]) => ({ name, count }))}
                        margin={{ left:-20 }}>
                        <XAxis dataKey="name" tick={{ fill:"#a6adc8", fontSize:12 }}/>
                        <YAxis tick={{ fill:"#585b70", fontSize:11 }}/>
                        <Tooltip contentStyle={{ background:"#1e1e2e",
                          border:"1px solid #313244", borderRadius:8, color:"#cdd6f4" }}/>
                        <Bar dataKey="count" radius={[4,4,0,0]}>
                          {Object.entries(LEVEL_LABELS).map(([v, l]) => (
                            <Cell key={l} fill={LEVEL_COLORS[v] || "#585b70"}/>
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}

            {/* ── Role Fit tab ── */}
            {tab === "fit" && fits && (
              <>
                <div className="card" style={{ marginBottom:20 }}>
                  <div className="section-title" style={{ fontSize:15, marginBottom:4 }}>
                    🎯 Resume Fit Score — All Roles
                  </div>
                  <p style={{ color:"var(--sub)", fontSize:13, marginBottom:20 }}>
                    How well your resume matches each career role, based on skill
                    coverage and proficiency levels. Click a role to see details.
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={fits.map(f => ({
                      role: f.role_name.split(" ").slice(0,2).join(" "),
                      score: f.fit_score,
                      full: f.role_name,
                    }))} margin={{ left:-10 }}>
                      <XAxis dataKey="role" tick={{ fill:"#a6adc8", fontSize:11 }}/>
                      <YAxis domain={[0,100]} tick={{ fill:"#585b70", fontSize:11 }}/>
                      <Tooltip
                        contentStyle={{ background:"#1e1e2e",
                          border:"1px solid #313244", borderRadius:8, color:"#cdd6f4" }}
                        formatter={(v, _, p) => [`${v}%`, p.payload.full]}/>
                      <Bar dataKey="score" radius={[4,4,0,0]}>
                        {fits.map((f,i) => (
                          <Cell key={i} fill={sc(f.fit_score)}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {fits.map((fit, i) => (
                    <RoleFitCard key={fit.role_name} fit={fit} rank={i+1}
                      selected={selectedFit?.role_name === fit.role_name}
                      onClick={() => { setSelectedFit(fit); setTab("detail"); }}/>
                  ))}
                </div>
              </>
            )}

            {/* ── Detail tab ── */}
            {tab === "detail" && selectedFit && (
              <>
                <div style={{ display:"flex", gap:10, marginBottom:20,
                  flexWrap:"wrap" }}>
                  {fits?.map((f,i) => (
                    <button key={f.role_name}
                      className={`btn ${selectedFit.role_name===f.role_name
                        ?"btn-primary":"btn-secondary"}`}
                      style={{ fontSize:12, padding:"6px 14px" }}
                      onClick={() => setSelectedFit(f)}>
                      {f.role_name.split(" ").slice(0,2).join(" ")} — {f.fit_score}%
                    </button>
                  ))}
                </div>

                <div className="grid-2" style={{ marginBottom:20 }}>
                  {/* Score + metrics */}
                  <div className="card" style={{ textAlign:"center",
                    borderTop:`3px solid ${sc(selectedFit.fit_score)}` }}>
                    <div style={{ fontSize:15, fontWeight:700,
                      color:"var(--purple)", marginBottom:16 }}>
                      {selectedFit.role_name}
                    </div>
                    <RadialProgress value={selectedFit.fit_score}
                      color={sc(selectedFit.fit_score)} size={150}/>
                    <div style={{ fontSize:16, fontWeight:800,
                      color:sc(selectedFit.fit_score), marginTop:12 }}>
                      {selectedFit.fit_label}
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                      gap:10, marginTop:16 }}>
                      {[
                        { label:"Coverage",     value:`${selectedFit.coverage_pct}%` },
                        { label:"Level Match",  value:`${selectedFit.avg_level_match}%` },
                        { label:"Skills Found", value:`${selectedFit.covered_count}/${selectedFit.required_count}` },
                        { label:"Critical Gaps",value: selectedFit.critical_missing?.length || 0 },
                      ].map(m => (
                        <div key={m.label} style={{ background:"var(--bg)",
                          borderRadius:8, padding:"10px 8px" }}>
                          <div style={{ fontSize:16, fontWeight:800,
                            color:"var(--purple)" }}>{m.value}</div>
                          <div style={{ fontSize:11, color:"var(--comment)" }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                    <button className="btn btn-primary btn-full"
                      style={{ marginTop:16 }}
                      onClick={goToAssess}>
                      🚀 Start Assessment (pre-filled)
                    </button>
                  </div>

                  {/* Gaps & strengths */}
                  <div className="card">
                    {selectedFit.critical_missing?.length > 0 && (
                      <>
                        <div className="section-title"
                          style={{ fontSize:14, color:"#FF6584", marginBottom:10 }}>
                          🚨 Critical Missing Skills
                        </div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:8,
                          marginBottom:20 }}>
                          {selectedFit.critical_missing.map(s => (
                            <span key={s} className="tag"
                              style={{ background:"#FF658422", color:"#FF6584",
                                fontSize:12, padding:"5px 12px" }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </>
                    )}

                    {selectedFit.strong_matches?.length > 0 && (
                      <>
                        <div className="section-title"
                          style={{ fontSize:14, color:"#43C6AC", marginBottom:10 }}>
                          ✅ Strong Matches
                        </div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:8,
                          marginBottom:20 }}>
                          {selectedFit.strong_matches.map(s => (
                            <span key={s} className="tag"
                              style={{ background:"#43C6AC22", color:"#43C6AC",
                                fontSize:12, padding:"5px 12px" }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </>
                    )}

                    {selectedFit.weak_matches?.length > 0 && (
                      <>
                        <div className="section-title"
                          style={{ fontSize:14, color:"#F7971E", marginBottom:10 }}>
                          ⚠️ Needs Improvement
                        </div>
                        {selectedFit.weak_matches.map(m => (
                          <div key={m.skill} style={{ display:"flex",
                            justifyContent:"space-between", alignItems:"center",
                            padding:"8px 0",
                            borderBottom:"1px solid var(--overlay)",
                            fontSize:13 }}>
                            <span style={{ fontWeight:600 }}>{m.skill}</span>
                            <span style={{ color:"#F7971E" }}>
                              Resume: {m.resume_level}/10 → Need: {m.required}/10
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* CTA */}
            {parsed && (
              <div style={{ display:"flex", gap:12, marginTop:8 }}>
                <button className="btn btn-primary" style={{ flex:1 }}
                  onClick={goToAssess} disabled={!selectedFit}>
                  🚀 Start Assessment with Pre-filled Skills
                </button>
                <button className="btn btn-secondary" style={{ flex:1 }}
                  onClick={() => nav("/assess")}>
                  📝 Manual Assessment Instead
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
