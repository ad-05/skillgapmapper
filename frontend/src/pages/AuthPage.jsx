import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Alert, Spinner } from "../components";

export default function AuthPage() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode]       = useState("login");   // "login" | "register"
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // form fields
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [pw, setPw]           = useState("");
  const [role, setRole]       = useState("learner");

  const redirect = (user) => {
    if (user.role === "admin")   nav("/admin");
    else if (user.role === "mentor") nav("/mentor");
    else nav("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let user;
      if (mode === "login") {
        user = await login(email, pw);
      } else {
        user = await register(name, email, pw, role);
      }
      redirect(user);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const roleCards = [
    { value: "learner", icon: "🎓", title: "Learner", desc: "Assess skills & get recommendations" },
    { value: "mentor",  icon: "👨‍🏫", title: "Mentor",  desc: "Monitor learner progress & gaps" },
  ];

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">🎯</div>
        <div className="auth-title">SkillMapper AI</div>
        <div className="auth-sub">
          {mode === "login" ? "Sign in to your account" : "Create your account"}
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <div className="form-group">
                <label className="label">Full Name</label>
                <input className="input" placeholder="e.g. Muskan Choudhary"
                  value={name} onChange={e => setName(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="label">Select Your Role</label>
                <div className="role-select-grid">
                  {roleCards.map(c => (
                    <div key={c.value}
                      className={`role-select-card${role === c.value ? " active" : ""}`}
                      onClick={() => setRole(c.value)}>
                      <div style={{fontSize:28, marginBottom:6}}>{c.icon}</div>
                      <div style={{fontWeight:700, fontSize:14}}>{c.title}</div>
                      <div style={{fontSize:12, color:"var(--sub)", marginTop:4}}>{c.desc}</div>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:12, color:"var(--comment)", textAlign:"center"}}>
                  🔒 Admin accounts are reserved and not available for self-registration
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="label">Email Address</label>
            <input className="input" type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="label">Password {mode === "register" && <span style={{color:"var(--comment)", fontWeight:400}}>(min 6 chars)</span>}</label>
            <input className="input" type="password" placeholder="••••••••"
              value={pw} onChange={e => setPw(e.target.value)} required />
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}
            style={{fontSize:15, padding:"13px", marginTop:8}}>
            {loading
              ? <><Spinner size={18}/> {mode === "login" ? "Signing in..." : "Creating account..."}</>
              : mode === "login" ? "Sign In" : "Create Account"
            }
          </button>
        </form>

        <div className="auth-divider">or</div>

        <div className="auth-switch">
          {mode === "login" ? (
            <>Don't have an account? <a onClick={() => { setMode("register"); setError(""); }}>Sign up</a></>
          ) : (
            <>Already have an account? <a onClick={() => { setMode("login"); setError(""); }}>Sign in</a></>
          )}
        </div>

        {mode === "login" && (
          <div style={{marginTop:16, padding:"12px 16px", background:"var(--bg)", borderRadius:8, fontSize:12, color:"var(--comment)"}}>
            <strong style={{color:"var(--sub)"}}>Demo credentials</strong><br/>
            Admin: admin@skillmapper.com / admin123<br/>
            Or register a new learner / mentor account above.
          </div>
        )}
      </div>
    </div>
  );
}
