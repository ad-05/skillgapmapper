import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, getRoles, getMyAssessments } from "../auth";
import { RoleCard, ScoreBadge, Spinner } from "../components";

export default function Home() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [roles, setRoles]         = useState([]);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const calls = [getRoles()];
    if (user?.role === "learner") calls.push(getMyAssessments());
    Promise.all(calls)
      .then(([r, h]) => {
        setRoles(r.data.roles);
        if (h) setHistory(h.data.assessments);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const best = history.length
    ? Math.max(...history.map(a => a.readiness_score))
    : null;

  if (loading) return <div className="page" style={{textAlign:"center",paddingTop:80}}><Spinner/></div>;

  return (
    <div className="page">
      <div className="container">

        {/* Hero */}
        <div style={{paddingTop:48, paddingBottom:40}}>
          <h1 className="page-title">
            Welcome back, {user?.name.split(" ")[0]} 👋
          </h1>
          <p style={{color:"var(--sub)", fontSize:17, marginBottom:36}}>
            {user?.role === "learner"
              ? "Ready to check your career readiness today?"
              : "Here's an overview of the platform."}
          </p>
          <div style={{display:"flex", gap:14, flexWrap:"wrap"}}>
            <button className="btn btn-primary" style={{fontSize:15, padding:"13px 28px"}}
              onClick={() => nav("/assess")}>
              🚀 Start New Assessment
            </button>
            {history.length > 0 && (
              <button className="btn btn-ghost" style={{fontSize:15, padding:"13px 28px"}}
                onClick={() => nav("/history")}>
                📋 My History
              </button>
            )}
          </div>
        </div>

        {/* Stats row for learners */}
        {user?.role === "learner" && history.length > 0 && (
          <div className="grid-3" style={{marginBottom:40}}>
            <div className="stat-card">
              <div className="stat-value" style={{color:"var(--purple)"}}>{history.length}</div>
              <div className="stat-label">Total Assessments</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{color:"var(--teal)"}}>{best}%</div>
              <div className="stat-label">Best Score</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{color:"var(--blue)"}}>
                {Math.round(history.reduce((s,a) => s+a.readiness_score, 0)/history.length)}%
              </div>
              <div className="stat-label">Average Score</div>
            </div>
          </div>
        )}

        {/* Recent assessments */}
        {user?.role === "learner" && history.length > 0 && (
          <div className="card" style={{marginBottom:40}}>
            <div className="section-title" style={{fontSize:16}}>Recent Assessments</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Target Role</th><th>Score</th><th>Status</th><th>Date</th><th></th></tr></thead>
                <tbody>
                  {history.slice(0,5).map(a => (
                    <tr key={a.id}>
                      <td style={{fontWeight:600}}>{a.target_role}</td>
                      <td style={{fontWeight:800, color: a.readiness_score>=75?"#43C6AC":a.readiness_score>=50?"#F7971E":"#FF6584"}}>
                        {a.readiness_score}%
                      </td>
                      <td><ScoreBadge score={a.readiness_score}/></td>
                      <td style={{color:"var(--comment)", fontSize:12}}>{new Date(a.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-secondary" style={{fontSize:12, padding:"5px 12px"}}
                          onClick={() => nav("/assess")}>Re-assess</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Feature cards */}
        <div className="section-title">How It Works</div>
        <div className="grid-3" style={{marginBottom:48}}>
          {[
            {icon:"📝", title:"Rate Your Skills", desc:"Select a career role, then rate your proficiency (0–10) for each required skill."},
            {icon:"🧬", title:"Cosine Similarity ML", desc:"Scikit-learn computes the similarity between your skill vector and the industry benchmark."},
            {icon:"🤖", title:"AI Recommendations", desc:"Claude AI generates 3 personalised, actionable steps to close your gaps and land the role."},
          ].map(f => (
            <div className="card" key={f.title} style={{borderTop:"3px solid var(--purple)"}}>
              <div style={{fontSize:32, marginBottom:12}}>{f.icon}</div>
              <div style={{fontWeight:700, fontSize:15, color:"var(--purple)", marginBottom:8}}>{f.title}</div>
              <div style={{color:"var(--sub)", fontSize:14, lineHeight:1.7}}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Available roles */}
        <div className="section-title">Available Career Roles</div>
        <div className="grid-roles">
          {roles.map(r => (
            <RoleCard key={r.id} role={r}
              onClick={() => nav("/assess", {state:{preselect: r.role_name}})}/>
          ))}
        </div>
      </div>
    </div>
  );
}
