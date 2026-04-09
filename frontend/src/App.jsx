import React from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { RolePill, Spinner } from "./components";

import AuthPage from "./pages/AuthPage";
import Home     from "./pages/Home";
import Assess   from "./pages/Assess";
import Results  from "./pages/Results";
import History  from "./pages/History";
import Mentor   from "./pages/Mentor";
import Admin    from "./pages/Admin";
import Resume  from "./pages/Resume";

// ── Protected route wrapper ───────────────────────────────────────────────────
function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{display:"flex",alignItems:"center",
    justifyContent:"center",height:"80vh"}}><Spinner size={36}/></div>;
  if (!user)   return <Navigate to="/auth" replace/>;
  if (roles && !roles.includes(user.role))
    return <Navigate to="/" replace/>;
  return children;
}

// ── Top nav ───────────────────────────────────────────────────────────────────
function Nav() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  if (!user) return null;   // no nav on auth page

  const links = [
    ...(user.role === "learner" ? [
      {to:"/",       label:"Home",     icon:"🏠"},
      {to:"/assess", label:"Assess",   icon:"📝"},
      {to:"/history",label:"History",  icon:"📋"},
      {to:"/resume", label:"Resume", icon:"📄"},
    ] : []),
    ...(user.role === "mentor" ? [
      {to:"/mentor", label:"Dashboard",icon:"📊"},
    ] : []),
    ...(user.role === "admin" ? [
      {to:"/mentor", label:"Mentor",   icon:"📊"},
      {to:"/admin",  label:"Admin",    icon:"⚙️"},
    ] : []),
  ];

  const roleColors = {
    admin:"#FF6584", mentor:"#F7971E", learner:"#43C6AC"
  };

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link to="/" className="nav-logo">🎯 SkillMapper AI</Link>

        <div className="nav-links">
          {links.map(l => (
            <Link key={l.to} to={l.to}
              className={`nav-link${loc.pathname===l.to?" active":""}`}>
              {l.icon} {l.label}
            </Link>
          ))}
        </div>

        <div className="nav-right">
          <div className="nav-user">
            <RolePill role={user.role}/>
            <span style={{maxWidth:140, overflow:"hidden", textOverflow:"ellipsis",
              whiteSpace:"nowrap"}}>{user.name}</span>
          </div>
          <button className="btn btn-ghost"
            style={{fontSize:13, padding:"7px 14px"}}
            onClick={logout}>
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}

// ── Root redirect based on role ───────────────────────────────────────────────
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user)   return <Navigate to="/auth" replace/>;
  if (user.role === "admin")  return <Navigate to="/admin" replace/>;
  if (user.role === "mentor") return <Navigate to="/mentor" replace/>;
  return <Home/>;
}

// ── App shell ─────────────────────────────────────────────────────────────────
function AppShell() {
  const { user } = useAuth();
  return (
    <>
      <Nav/>
      <Routes>
        <Route path="/auth" element={
          user ? <Navigate to="/" replace/> : <AuthPage/>
        }/>

        <Route path="/" element={
          <Protected><RootRedirect/></Protected>
        }/>

        <Route path="/assess" element={
          <Protected roles={["learner"]}><Assess/></Protected>
        }/>
        <Route path="/results" element={
          <Protected roles={["learner"]}><Results/></Protected>
        }/>
        <Route path="/resume" element={
          <Protected roles={['learner']}><Resume/></Protected>
        }/>
        <Route path="/history" element={
          <Protected roles={["learner"]}><History/></Protected>
        }/>

        <Route path="/mentor" element={
          <Protected roles={["mentor","admin"]}><Mentor/></Protected>
        }/>

        <Route path="/admin" element={
          <Protected roles={["admin"]}><Admin/></Protected>
        }/>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>

      {user && (
        <footer className="footer">
          <div className="container">
            AI-Based Skill Gap → Career Mapper · Muskan Choudhary & Anushka Das ·
            Cosine Similarity (scikit-learn) + Claude AI
          </div>
        </footer>
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell/>
      </BrowserRouter>
    </AuthProvider>
  );
}
