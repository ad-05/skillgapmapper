import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyAssessments } from "../auth";
import { ScoreBadge, Spinner, AccessDenied, RadialProgress } from "../components";
import { useAuth } from "../auth";

export default function History() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    getMyAssessments()
      .then(r => setAssessments(r.data.assessments))
      .finally(() => setLoading(false));
  }, []);

  if (user?.role !== "learner") return <AccessDenied message="Only Learners can view their history."/>;
  if (loading) return <div className="page" style={{textAlign:"center",paddingTop:80}}><Spinner/></div>;

  const sc = s => s >= 75 ? "#43C6AC" : s >= 50 ? "#F7971E" : "#FF6584";

  return (
    <div className="page">
      <div className="container">
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between",
          flexWrap:"wrap", gap:16, marginBottom:32}}>
          <div>
            <h1 className="page-title" style={{marginBottom:4}}>My Assessment History</h1>
            <p style={{color:"var(--sub)"}}>{assessments.length} assessment{assessments.length !== 1 ? "s" : ""} recorded</p>
          </div>
          <button className="btn btn-primary" onClick={() => nav("/assess")}>
            + New Assessment
          </button>
        </div>

        {assessments.length === 0 ? (
          <div className="card" style={{textAlign:"center", padding:"60px 20px"}}>
            <div style={{fontSize:48, marginBottom:16}}>📋</div>
            <div style={{fontSize:18, fontWeight:700, marginBottom:8}}>No assessments yet</div>
            <div style={{color:"var(--sub)", marginBottom:24}}>
              Take your first assessment to see your career readiness score.
            </div>
            <button className="btn btn-primary" onClick={() => nav("/assess")}>
              🚀 Start Now
            </button>
          </div>
        ) : (
          <div style={{display:"flex", flexDirection:"column", gap:16}}>
            {assessments.map(a => (
              <div key={a.id} className="card" style={{cursor:"pointer"}}
                onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                <div style={{display:"flex", alignItems:"center", gap:20}}>
                  <RadialProgress value={a.readiness_score} color={sc(a.readiness_score)} size={72}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700, fontSize:16}}>{a.target_role}</div>
                    <div style={{color:"var(--sub)", fontSize:13, marginTop:2}}>
                      {new Date(a.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <ScoreBadge score={a.readiness_score}/>
                    <div style={{fontSize:12, color:"var(--comment)", marginTop:6}}>
                      {a.gaps?.length} gaps · {a.strengths?.length} strengths
                    </div>
                  </div>
                  <div style={{color:"var(--comment)", fontSize:20}}>
                    {expanded === a.id ? "▲" : "▼"}
                  </div>
                </div>

                {expanded === a.id && (
                  <div style={{marginTop:24, borderTop:"1px solid var(--overlay)", paddingTop:20}}>
                    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20}}>
                      <div>
                        <div style={{fontWeight:700, fontSize:14, marginBottom:12,
                          color:"#FF6584"}}>Top Gaps</div>
                        {a.gaps?.slice(0,5).map(g => (
                          <div key={g.skill} style={{display:"flex", justifyContent:"space-between",
                            fontSize:13, padding:"6px 0", borderBottom:"1px solid var(--overlay)"}}>
                            <span>{g.skill}</span>
                            <span style={{color:"#FF6584"}}>+{g.deficit} needed</span>
                          </div>
                        ))}
                        {a.gaps?.length === 0 && (
                          <div style={{color:"var(--sub)", fontSize:13}}>No gaps! 🎉</div>
                        )}
                      </div>
                      <div>
                        <div style={{fontWeight:700, fontSize:14, marginBottom:12,
                          color:"#43C6AC"}}>Strengths</div>
                        <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
                          {a.strengths?.slice(0,6).map(s => (
                            <span key={s.skill} className="tag"
                              style={{background:"#43C6AC22",color:"#43C6AC",fontSize:12}}>
                              {s.skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button className="btn btn-primary" style={{marginTop:20}}
                      onClick={e => { e.stopPropagation(); nav("/assess",
                        {state:{preselect:a.target_role}}); }}>
                      Reassess this role
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
