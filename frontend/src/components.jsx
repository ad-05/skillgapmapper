import React from "react";

export function RadialProgress({ value, color, size = 130 }) {
  const r = (size - 18) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(value, 100) / 100) * circ;
  return (
    <div className="radial-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e1e2e" strokeWidth="10"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ/4}
          strokeLinecap="round" style={{transition:"stroke-dasharray 1.1s cubic-bezier(.4,0,.2,1)"}}/>
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize={size*.16} fontWeight="800"
          fontFamily="'Space Grotesk',sans-serif">{Math.round(value)}%</text>
      </svg>
    </div>
  );
}

export function SkillBar({ skill, userLevel, required }) {
  const gap = Math.max(0, required - userLevel);
  const status = userLevel >= required ? "strong" : userLevel >= required * 0.65 ? "close" : "gap";
  const color = { strong:"#43C6AC", close:"#F7971E", gap:"#FF6584" }[status];
  return (
    <div className="skill-bar-wrap">
      <div className="skill-bar-header">
        <span style={{color:"#cdd6f4"}}>{skill}</span>
        <span style={{color, fontSize:12, fontWeight:700}}>
          {userLevel}/10 {gap > 0 ? `(need +${gap})` : "✓"}
        </span>
      </div>
      <div className="skill-bar-track">
        <div className="skill-bar-req" style={{width:`${required*10}%`}}/>
        <div className="skill-bar-fill" style={{width:`${userLevel*10}%`, background:color}}/>
      </div>
    </div>
  );
}

export function Spinner({ size = 26 }) {
  return <div className="spinner" style={{width:size, height:size}}/>;
}

export function Alert({ type = "error", children }) {
  const icons = { error:"⚠️", success:"✅", info:"ℹ️" };
  return (
    <div className={`alert alert-${type}`}>
      <span>{icons[type]}</span>
      <span>{children}</span>
    </div>
  );
}

export function ScoreBadge({ score }) {
  const color = score >= 75 ? "#43C6AC" : score >= 50 ? "#F7971E" : "#FF6584";
  const label = score >= 75 ? "Job Ready 🎉" : score >= 50 ? "Almost There 💪" : "Keep Growing 🌱";
  return <span className="tag" style={{background:color+"22", color}}>{label}</span>;
}

export function RolePill({ role }) {
  const map = {
    admin:   { color:"#FF6584", bg:"#FF658422" },
    mentor:  { color:"#F7971E", bg:"#F7971E22" },
    learner: { color:"#43C6AC", bg:"#43C6AC22" },
  };
  const s = map[role] || map.learner;
  return (
    <span className="role-pill" style={{color:s.color, background:s.bg}}>
      {role === "admin" ? "⚙️" : role === "mentor" ? "👨‍🏫" : "🎓"} {role}
    </span>
  );
}

export function RoleCard({ role, onClick, selected }) {
  return (
    <div onClick={onClick} className="card" style={{
      textAlign:"center", cursor:"pointer", padding:"20px 14px",
      borderColor: selected ? role.color : undefined,
      background: selected ? role.color+"11" : undefined,
      transition:"all .2s"
    }}>
      <div style={{fontSize:28, marginBottom:8}}>{role.icon}</div>
      <div style={{fontSize:13, fontWeight:700, color:role.color}}>{role.role_name}</div>
      <div style={{fontSize:11, color:"#585b70", marginTop:4}}>
        {Object.values(role.skills).filter(v=>v>0).length} skills
      </div>
    </div>
  );
}

export function AccessDenied({ message }) {
  return (
    <div className="denied-wrap">
      <div style={{fontSize:56}}>🔒</div>
      <div style={{fontSize:22, fontWeight:800}}>Access Denied</div>
      <div style={{color:"var(--sub)", maxWidth:360}}>{message || "You don't have permission to view this page."}</div>
    </div>
  );
}
