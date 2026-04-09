import React, { useEffect, useState, useMemo } from "react";
import { useAuth, getAllAssessments, getStats } from "../auth";
import { Spinner, ScoreBadge, RadialProgress, AccessDenied } from "../components";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, ReferenceLine, Legend,
} from "recharts";

const COLORS = ["#cba6f7","#43C6AC","#89b4fa","#F7971E","#FF6584","#ec4899"];
const sc = s => s >= 75 ? "#43C6AC" : s >= 50 ? "#F7971E" : "#FF6584";

// ── Group flat assessment list into per-learner profiles ──────────────────────
function groupByLearner(assessments) {
  const map = {};
  assessments.forEach(a => {
    const uid = a.user_id;
    if (!map[uid]) {
      map[uid] = {
        user_id:    uid,
        user_name:  a.user_name,
        user_email: a.user_email,
        assessments: [],
      };
    }
    map[uid].assessments.push(a);
  });

  // Sort each learner's assessments oldest → newest for the trend line
  return Object.values(map).map(learner => {
    const sorted = [...learner.assessments].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
    const latest  = sorted[sorted.length - 1];
    const first   = sorted[0];
    const best    = Math.max(...sorted.map(a => a.readiness_score));
    const trend   = sorted.length > 1
      ? latest.readiness_score - first.readiness_score
      : 0;
    return { ...learner, assessments: sorted, latest, first, best, trend };
  }).sort((a, b) => b.latest.readiness_score - a.latest.readiness_score);
}

// ── Trend arrow ───────────────────────────────────────────────────────────────
function TrendBadge({ trend }) {
  if (Math.abs(trend) < 1) return (
    <span style={{fontSize:12, color:"var(--sub)"}}>→ No change</span>
  );
  const up = trend > 0;
  return (
    <span style={{
      fontSize:12, fontWeight:700,
      color: up ? "#43C6AC" : "#FF6584",
      background: up ? "#43C6AC22" : "#FF658422",
      padding:"2px 8px", borderRadius:20
    }}>
      {up ? "▲" : "▼"} {Math.abs(trend.toFixed(1))}% {up ? "improvement" : "decline"}
    </span>
  );
}

// ── Learner card in the list ───────────────────────────────────────────────────
function LearnerCard({ learner, onClick }) {
  const { user_name, user_email, assessments, latest, trend } = learner;
  return (
    <div className="card" onClick={onClick}
      style={{ cursor:"pointer", display:"flex", alignItems:"center",
        gap:20, transition:"border-color .2s",
        borderLeft:`4px solid ${sc(latest.readiness_score)}` }}>
      <RadialProgress value={latest.readiness_score}
        color={sc(latest.readiness_score)} size={72}/>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontWeight:700, fontSize:15}}>{user_name}</div>
        <div style={{color:"var(--sub)", fontSize:13, marginBottom:4}}>{user_email}</div>
        <div style={{display:"flex", gap:8, flexWrap:"wrap", alignItems:"center"}}>
          <TrendBadge trend={trend}/>
          <span style={{fontSize:12, color:"var(--comment)"}}>
            {assessments.length} assessment{assessments.length !== 1 ? "s" : ""}
          </span>
          <span style={{fontSize:12, color:"var(--comment)"}}>
            Last: {latest.target_role}
          </span>
        </div>
      </div>
      <div style={{textAlign:"right", flexShrink:0}}>
        <ScoreBadge score={latest.readiness_score}/>
        <div style={{fontSize:11, color:"var(--comment)", marginTop:6}}>
          Latest · {new Date(latest.created_at).toLocaleDateString()}
        </div>
      </div>
      <div style={{color:"var(--comment)", fontSize:18}}>›</div>
    </div>
  );
}

// ── Full per-learner profile with history timeline ────────────────────────────
function LearnerProfile({ learner, onBack }) {
  const { user_name, user_email, assessments, latest, best, trend } = learner;
  const [activeAssessment, setActiveAssessment] = useState(latest);

  // Build chart data — one point per assessment
  const chartData = assessments.map((a, i) => ({
    label: `#${i + 1} ${a.target_role.split(" ").slice(0,2).join(" ")}`,
    score: a.readiness_score,
    date:  new Date(a.created_at).toLocaleDateString(),
    role:  a.target_role,
  }));

  // Find biggest gap across all assessments for this learner
  const allGaps = assessments.flatMap(a => a.gaps || []);
  const topGaps = Object.entries(
    allGaps.reduce((acc, g) => {
      acc[g.skill] = (acc[g.skill] || 0) + g.deficit;
      return acc;
    }, {})
  ).sort(([,a],[,b]) => b - a).slice(0, 6);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background:"var(--surface)", border:"1px solid var(--overlay)",
        borderRadius:8, padding:"10px 14px", fontSize:13 }}>
        <div style={{fontWeight:700, color:"var(--purple)", marginBottom:4}}>{d.role}</div>
        <div style={{color:sc(d.score), fontWeight:800, fontSize:16}}>{d.score}%</div>
        <div style={{color:"var(--comment)", fontSize:11, marginTop:2}}>{d.date}</div>
      </div>
    );
  };

  return (
    <div>
      <button className="btn btn-secondary" style={{marginBottom:24, fontSize:13}}
        onClick={onBack}>← Back to Learners</button>

      {/* Header */}
      <div className="card" style={{marginBottom:20,
        borderTop:`3px solid ${sc(latest.readiness_score)}`}}>
        <div style={{display:"flex", alignItems:"center", gap:20, flexWrap:"wrap"}}>
          <div style={{
            width:56, height:56, borderRadius:"50%",
            background:`${sc(latest.readiness_score)}33`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:22, fontWeight:800, color:sc(latest.readiness_score)
          }}>
            {user_name.charAt(0).toUpperCase()}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:20, fontWeight:800}}>{user_name}</div>
            <div style={{color:"var(--sub)", fontSize:14}}>{user_email}</div>
          </div>
          <div style={{display:"flex", gap:16, flexWrap:"wrap"}}>
            {[
              {label:"Latest Score", value:`${latest.readiness_score}%`, color:sc(latest.readiness_score)},
              {label:"Best Score",   value:`${best}%`,                   color:"var(--purple)"},
              {label:"Assessments",  value:assessments.length,           color:"var(--blue)"},
            ].map(s => (
              <div key={s.label} style={{textAlign:"center", padding:"0 12px",
                borderLeft:"1px solid var(--overlay)"}}>
                <div style={{fontSize:22, fontWeight:800, color:s.color}}>{s.value}</div>
                <div style={{fontSize:11, color:"var(--comment)"}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{marginBottom:20}}>

        {/* Progression chart */}
        <div className="card">
          <div style={{display:"flex", alignItems:"center",
            justifyContent:"space-between", marginBottom:16}}>
            <div className="section-title" style={{fontSize:15, marginBottom:0}}>
              📈 Score Progression
            </div>
            <TrendBadge trend={trend}/>
          </div>

          {assessments.length === 1 ? (
            <div style={{textAlign:"center", padding:"24px 0",
              color:"var(--comment)", fontSize:13}}>
              Only 1 assessment so far. Trend will appear after the learner reassesses.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{left:-20, right:8, top:8}}>
                <CartesianGrid stroke="#313244" strokeDasharray="3 3"/>
                <XAxis dataKey="label" tick={{fill:"#585b70", fontSize:10}}/>
                <YAxis domain={[0,100]} tick={{fill:"#585b70", fontSize:10}}/>
                <Tooltip content={<CustomTooltip/>}/>
                <ReferenceLine y={75} stroke="#43C6AC44" strokeDasharray="4 4"
                  label={{value:"Job Ready", fill:"#43C6AC", fontSize:10}}/>
                <ReferenceLine y={50} stroke="#F7971E44" strokeDasharray="4 4"
                  label={{value:"Almost There", fill:"#F7971E", fontSize:10}}/>
                <Line type="monotone" dataKey="score" stroke="#cba6f7"
                  strokeWidth={2.5} dot={{fill:"#cba6f7", r:5}}
                  activeDot={{r:7, fill:"#fff"}}/>
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Persistent gaps — skills that keep appearing across sessions */}
        <div className="card">
          <div className="section-title" style={{fontSize:15, marginBottom:4}}>
            🔁 Persistent Skill Gaps
          </div>
          <p style={{color:"var(--sub)", fontSize:12, marginBottom:16}}>
            Skills with the highest cumulative deficit across all assessments.
          </p>
          {topGaps.length === 0 ? (
            <div style={{color:"var(--sub)", fontSize:13}}>No gaps found — great work! 🎉</div>
          ) : (
            topGaps.map(([skill, total]) => (
              <div key={skill} style={{marginBottom:12}}>
                <div style={{display:"flex", justifyContent:"space-between",
                  fontSize:13, marginBottom:5}}>
                  <span style={{fontWeight:600}}>{skill}</span>
                  <span style={{color:"#FF6584", fontWeight:700}}>
                    cumulative deficit: {total}
                  </span>
                </div>
                <div style={{height:6, background:"var(--overlay)",
                  borderRadius:3, overflow:"hidden"}}>
                  <div style={{
                    height:"100%", borderRadius:3, background:"#FF6584",
                    width:`${Math.min((total / (topGaps[0][1] || 1)) * 100, 100)}%`,
                    transition:"width .6s ease"
                  }}/>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Assessment timeline */}
      <div className="card" style={{marginBottom:20}}>
        <div className="section-title" style={{fontSize:15, marginBottom:16}}>
          🕒 Assessment Timeline
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:0}}>
          {[...assessments].reverse().map((a, i) => {
            const isActive = activeAssessment?.id === a.id;
            const isLatest = i === 0;
            return (
              <div key={a.id}
                onClick={() => setActiveAssessment(isActive ? null : a)}
                style={{
                  display:"flex", gap:16, cursor:"pointer",
                  padding:"14px 0",
                  borderBottom:"1px solid var(--overlay)",
                }}>
                {/* Timeline dot */}
                <div style={{display:"flex", flexDirection:"column",
                  alignItems:"center", width:32, flexShrink:0}}>
                  <div style={{
                    width:12, height:12, borderRadius:"50%", marginTop:4,
                    background: sc(a.readiness_score),
                    boxShadow: isLatest ? `0 0 0 3px ${sc(a.readiness_score)}44` : "none"
                  }}/>
                  {i < assessments.length - 1 && (
                    <div style={{width:2, flex:1, background:"var(--overlay)",
                      marginTop:4, minHeight:20}}/>
                  )}
                </div>

                {/* Content */}
                <div style={{flex:1}}>
                  <div style={{display:"flex", justifyContent:"space-between",
                    alignItems:"center", flexWrap:"wrap", gap:8}}>
                    <div>
                      <span style={{fontWeight:700}}>{a.target_role}</span>
                      {isLatest && (
                        <span style={{marginLeft:8, fontSize:11, color:"var(--purple)",
                          background:"var(--purple)22", padding:"2px 8px",
                          borderRadius:20, fontWeight:700}}>Latest</span>
                      )}
                    </div>
                    <div style={{display:"flex", gap:10, alignItems:"center"}}>
                      <span style={{fontWeight:800, fontSize:15,
                        color:sc(a.readiness_score)}}>
                        {a.readiness_score}%
                      </span>
                      <ScoreBadge score={a.readiness_score}/>
                      <span style={{fontSize:12, color:"var(--comment)"}}>
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Expandable gap/strength detail */}
                  {isActive && (
                    <div style={{marginTop:14, display:"grid",
                      gridTemplateColumns:"1fr 1fr", gap:16}}>
                      <div>
                        <div style={{fontWeight:700, fontSize:13,
                          color:"#FF6584", marginBottom:8}}>Gaps</div>
                        {a.gaps?.slice(0, 5).map(g => (
                          <div key={g.skill} style={{display:"flex",
                            justifyContent:"space-between", fontSize:12,
                            padding:"5px 0", borderBottom:"1px solid var(--overlay)"}}>
                            <span>{g.skill}</span>
                            <span style={{color:"#FF6584"}}>+{g.deficit} needed</span>
                          </div>
                        ))}
                        {(!a.gaps || a.gaps.length === 0) && (
                          <span style={{color:"var(--sub)", fontSize:12}}>None 🎉</span>
                        )}
                      </div>
                      <div>
                        <div style={{fontWeight:700, fontSize:13,
                          color:"#43C6AC", marginBottom:8}}>Strengths</div>
                        <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
                          {a.strengths?.slice(0,6).map(s => (
                            <span key={s.skill} className="tag"
                              style={{background:"#43C6AC22", color:"#43C6AC",
                                fontSize:11, padding:"3px 8px"}}>
                              {s.skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Mentor page ──────────────────────────────────────────────────────────
export default function Mentor() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState("overview");
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [search, setSearch]           = useState("");

  useEffect(() => {
    Promise.all([getAllAssessments(), getStats()])
      .then(([a, s]) => {
        setAssessments(a.data.assessments);
        setStats(s.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const learners = useMemo(() => groupByLearner(assessments), [assessments]);

  const filteredLearners = useMemo(() =>
    learners.filter(l =>
      l.user_name.toLowerCase().includes(search.toLowerCase()) ||
      l.user_email.toLowerCase().includes(search.toLowerCase()) ||
      l.assessments.some(a =>
        a.target_role.toLowerCase().includes(search.toLowerCase())
      )
    ), [learners, search]
  );

  if (user?.role !== "mentor" && user?.role !== "admin")
    return <AccessDenied message="Only Mentors and Admins can access this dashboard."/>;

  if (loading)
    return <div className="page" style={{textAlign:"center", paddingTop:80}}><Spinner/></div>;

  const improving = learners.filter(l => l.trend > 0).length;
  const needHelp  = learners.filter(l => l.latest.readiness_score < 60).length;

  const tabs = [
    {id:"overview", label:"📊 Overview"},
    {id:"learners", label:`👥 Learners (${learners.length})`},
  ];

  return (
    <div className="page">
      <div className="container">

        {/* If a learner is selected, show their full profile */}
        {selectedLearner ? (
          <LearnerProfile
            learner={selectedLearner}
            onBack={() => setSelectedLearner(null)}
          />
        ) : (
          <>
            <h1 className="page-title">Mentor Dashboard</h1>
            <p style={{color:"var(--sub)", marginBottom:28}}>
              Track learner progress, identify skill gaps, and monitor improvement over time.
            </p>

            {/* Tabs */}
            <div style={{display:"flex", gap:8, marginBottom:28}}>
              {tabs.map(t => (
                <button key={t.id}
                  className={`btn ${tab===t.id?"btn-primary":"btn-secondary"}`}
                  style={{fontSize:13, padding:"8px 18px"}}
                  onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Overview tab ── */}
            {tab === "overview" && (
              <>
                <div className="grid-3" style={{marginBottom:28}}>
                  {[
                    {label:"Total Learners",    value:learners.length,                 color:"var(--purple)"},
                    {label:"Improving",         value:`${improving} learners`,         color:"var(--teal)"},
                    {label:"Need Support",      value:`${needHelp} learners`,          color:"var(--red)"},
                  ].map(s => (
                    <div className="stat-card" key={s.label}>
                      <div className="stat-value" style={{color:s.color}}>{s.value}</div>
                      <div className="stat-label">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="grid-2" style={{marginBottom:28}}>
                  {/* Bar chart */}
                  {stats?.role_distribution?.length > 0 && (
                    <div className="card">
                      <div className="section-title" style={{fontSize:15, marginBottom:20}}>
                        Assessments by Career Role
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={stats.role_distribution} margin={{left:-20}}>
                          <XAxis dataKey="role" tick={{fill:"#585b70", fontSize:10}}/>
                          <YAxis tick={{fill:"#585b70", fontSize:10}}/>
                          <Tooltip contentStyle={{background:"#1e1e2e",
                            border:"1px solid #313244", borderRadius:8, color:"#cdd6f4"}}/>
                          <Bar dataKey="count" radius={[4,4,0,0]}>
                            {stats.role_distribution.map((_,i) => (
                              <Cell key={i} fill={COLORS[i%COLORS.length]}/>
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Learners needing help */}
                  <div className="card">
                    <div className="section-title" style={{fontSize:15, marginBottom:16}}>
                      🚨 Learners Needing Support
                    </div>
                    {learners.filter(l => l.latest.readiness_score < 60).length === 0 ? (
                      <div style={{color:"var(--sub)", fontSize:13, textAlign:"center",
                        padding:"20px 0"}}>
                        All learners are above 60% 🎉
                      </div>
                    ) : (
                      learners
                        .filter(l => l.latest.readiness_score < 60)
                        .slice(0, 5)
                        .map(l => (
                          <div key={l.user_id}
                            onClick={() => setSelectedLearner(l)}
                            style={{display:"flex", alignItems:"center", gap:12,
                              padding:"10px 0", borderBottom:"1px solid var(--overlay)",
                              cursor:"pointer"}}>
                            <div style={{
                              width:36, height:36, borderRadius:"50%",
                              background:"#FF658422", color:"#FF6584",
                              display:"flex", alignItems:"center",
                              justifyContent:"center", fontWeight:800, fontSize:14,
                              flexShrink:0
                            }}>
                              {l.user_name.charAt(0)}
                            </div>
                            <div style={{flex:1}}>
                              <div style={{fontWeight:600, fontSize:13}}>{l.user_name}</div>
                              <div style={{fontSize:11, color:"var(--comment)"}}>
                                {l.latest.target_role}
                              </div>
                            </div>
                            <span style={{fontWeight:800, color:"#FF6584", fontSize:15}}>
                              {l.latest.readiness_score}%
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Recent activity */}
                <div className="card">
                  <div className="section-title" style={{fontSize:15, marginBottom:16}}>
                    Recent Activity
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr>
                        <th>Learner</th><th>Target Role</th>
                        <th>Score</th><th>Status</th><th>Date</th><th></th>
                      </tr></thead>
                      <tbody>
                        {assessments.slice(0, 10).map(a => (
                          <tr key={a.id}>
                            <td style={{fontWeight:600}}>{a.user_name}</td>
                            <td>{a.target_role}</td>
                            <td style={{fontWeight:800, color:sc(a.readiness_score)}}>
                              {a.readiness_score}%
                            </td>
                            <td><ScoreBadge score={a.readiness_score}/></td>
                            <td style={{color:"var(--comment)", fontSize:12}}>
                              {new Date(a.created_at).toLocaleDateString()}
                            </td>
                            <td>
                              <button className="btn btn-secondary"
                                style={{fontSize:12, padding:"5px 12px"}}
                                onClick={() => {
                                  const learner = learners.find(l => l.user_id === a.user_id);
                                  if (learner) { setSelectedLearner(learner); }
                                }}>
                                Profile
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ── Learners tab ── */}
            {tab === "learners" && (
              <>
                <input className="input"
                  placeholder="🔍 Search by name, email, or target role..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{marginBottom:20, maxWidth:440}}/>

                {filteredLearners.length === 0 ? (
                  <div style={{textAlign:"center", color:"var(--sub)", padding:40}}>
                    No learners found.
                  </div>
                ) : (
                  <div style={{display:"flex", flexDirection:"column", gap:12}}>
                    {filteredLearners.map(l => (
                      <LearnerCard
                        key={l.user_id}
                        learner={l}
                        onClick={() => setSelectedLearner(l)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
