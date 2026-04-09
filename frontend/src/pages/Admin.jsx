import React, { useEffect, useState } from "react";
import { useAuth, getRoles, addRole, updateRole, deleteRole, getUsers, deleteUser } from "../auth";
import { Spinner, Alert, AccessDenied, RolePill } from "../components";

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab]       = useState("roles");
  const [roles, setRoles]   = useState([]);
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg]         = useState({type:"",text:""});
  const [newRole, setNewRole] = useState({role_name:"",icon:"🌟",color:"#6C63FF",skills:{}});
  const [newSkill, setNewSkill]   = useState({name:"",value:7});
  const [editSkill, setEditSkill] = useState({name:"",value:7});

  const flash = (type, text) => {
    setMsg({type,text});
    setTimeout(()=>setMsg({type:"",text:""}), 3500);
  };

  const loadAll = () => {
    Promise.all([getRoles(), getUsers()])
      .then(([r,u]) => { setRoles(r.data.roles); setUsers(u.data.users); })
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{ loadAll(); }, []);

  if (user?.role !== "admin")
    return <AccessDenied message="Only Admins can access this panel."/>;

  if (loading)
    return <div className="page" style={{textAlign:"center",paddingTop:80}}><Spinner/></div>;

  const editedRole = editing ? roles.find(r=>r.id===editing) : null;

  const handleAddRole = async () => {
    if (!newRole.role_name.trim()) return flash("error","Role name is required.");
    if (Object.keys(newRole.skills).length===0) return flash("error","Add at least one skill.");
    try {
      await addRole(newRole);
      flash("success",`'${newRole.role_name}' added!`);
      setNewRole({role_name:"",icon:"🌟",color:"#6C63FF",skills:{}});
      loadAll();
    } catch(e) { flash("error", e.response?.data?.error || "Failed."); }
  };

  const handleUpdateRole = async (role) => {
    try {
      await updateRole(role.id, {skills:role.skills});
      flash("success","Role updated!");
      setEditing(null); loadAll();
    } catch { flash("error","Update failed."); }
  };

  const handleDeleteRole = async (id, name) => {
    if (!window.confirm(`Delete '${name}'?`)) return;
    try {
      await deleteRole(id);
      flash("success",`'${name}' deleted.`);
      setEditing(null); loadAll();
    } catch { flash("error","Delete failed."); }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Delete user '${name}'? All their assessments will also be deleted.`)) return;
    try {
      await deleteUser(id);
      flash("success",`User '${name}' deleted.`);
      loadAll();
    } catch(e) { flash("error", e.response?.data?.error || "Delete failed."); }
  };

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">⚙️ Admin Panel</h1>
        <p style={{color:"var(--sub)", marginBottom:28}}>
          Manage career roles, required skills, and registered users.
        </p>

        {msg.text && <Alert type={msg.type}>{msg.text}</Alert>}

        {/* Tabs */}
        <div style={{display:"flex",gap:8,marginBottom:28}}>
          {[{id:"roles",label:"🎯 Career Roles"},{id:"users",label:"👥 Users"}].map(t=>(
            <button key={t.id}
              className={`btn ${tab===t.id?"btn-primary":"btn-secondary"}`}
              style={{fontSize:13,padding:"8px 18px"}}
              onClick={()=>setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Roles tab ── */}
        {tab === "roles" && (
          <div className="grid-2">
            {/* Left: list + add */}
            <div>
              <div className="card" style={{marginBottom:20}}>
                <div className="section-title" style={{fontSize:15,marginBottom:14}}>
                  Career Roles ({roles.length})
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {roles.map(r=>(
                    <div key={r.id}
                      style={{display:"flex",alignItems:"center",gap:10,
                        padding:"10px 14px",borderRadius:8,cursor:"pointer",
                        background:editing===r.id?r.color+"22":"var(--bg)",
                        border:`1px solid ${editing===r.id?r.color:"var(--overlay)"}`}}
                      onClick={()=>setEditing(editing===r.id?null:r.id)}>
                      <span style={{fontSize:20}}>{r.icon}</span>
                      <span style={{fontWeight:600,flex:1,
                        color:editing===r.id?r.color:"var(--text)"}}>
                        {r.role_name}
                      </span>
                      <span style={{fontSize:12,color:"var(--comment)"}}>
                        {Object.values(r.skills).filter(v=>v>0).length} skills
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add new role */}
              <div className="card">
                <div className="section-title" style={{fontSize:15,marginBottom:16}}>
                  Add New Role
                </div>
                <div style={{display:"flex",gap:10,marginBottom:12}}>
                  <div style={{flex:3}}>
                    <label className="label">Role Name</label>
                    <input className="input" placeholder="e.g. UX Designer"
                      value={newRole.role_name}
                      onChange={e=>setNewRole(p=>({...p,role_name:e.target.value}))}/>
                  </div>
                  <div style={{flex:1}}>
                    <label className="label">Icon</label>
                    <input className="input" value={newRole.icon}
                      onChange={e=>setNewRole(p=>({...p,icon:e.target.value}))}/>
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Accent Color</label>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <input type="color" value={newRole.color}
                      style={{width:40,height:36,borderRadius:6,border:"none",cursor:"pointer"}}
                      onChange={e=>setNewRole(p=>({...p,color:e.target.value}))}/>
                    <span style={{fontSize:13,color:"var(--sub)"}}>{newRole.color}</span>
                  </div>
                </div>
                <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",
                  textTransform:"uppercase",letterSpacing:".05em",marginBottom:10}}>
                  Skills
                </div>
                {Object.entries(newRole.skills).map(([s,v])=>(
                  <div key={s} style={{display:"flex",alignItems:"center",
                    gap:8,marginBottom:8}}>
                    <span style={{flex:1,fontSize:13}}>{s}</span>
                    <span style={{color:"var(--purple)",fontWeight:700,fontSize:13}}>{v}</span>
                    <button className="btn btn-danger" style={{padding:"3px 10px",fontSize:12}}
                      onClick={()=>setNewRole(p=>{
                        const sk={...p.skills}; delete sk[s];
                        return {...p,skills:sk};
                      })}>✕</button>
                  </div>
                ))}
                <div style={{display:"flex",gap:8,marginBottom:12}}>
                  <input className="input" placeholder="Skill name"
                    value={newSkill.name}
                    onChange={e=>setNewSkill(p=>({...p,name:e.target.value}))}
                    style={{flex:2}}/>
                  <input type="number" className="input" min="1" max="10"
                    value={newSkill.value}
                    onChange={e=>setNewSkill(p=>({...p,value:+e.target.value}))}
                    style={{flex:1}}/>
                  <button className="btn btn-teal" style={{padding:"8px 14px"}}
                    onClick={()=>{
                      if(!newSkill.name.trim()) return;
                      setNewRole(p=>({...p,skills:{...p.skills,[newSkill.name]:newSkill.value}}));
                      setNewSkill({name:"",value:7});
                    }}>+</button>
                </div>
                <button className="btn btn-primary btn-full" onClick={handleAddRole}>
                  + Add Role
                </button>
              </div>
            </div>

            {/* Right: edit selected */}
            <div>
              {editedRole ? (
                <div className="card" style={{borderTop:`3px solid ${editedRole.color}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
                    <span style={{fontSize:28}}>{editedRole.icon}</span>
                    <div style={{fontSize:18,fontWeight:800,color:editedRole.color}}>
                      {editedRole.role_name}
                    </div>
                    <button className="btn btn-danger"
                      style={{marginLeft:"auto",fontSize:12,padding:"6px 14px"}}
                      onClick={()=>handleDeleteRole(editedRole.id,editedRole.role_name)}>
                      🗑 Delete
                    </button>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",
                    textTransform:"uppercase",letterSpacing:".05em",marginBottom:12}}>
                    Required Skill Levels
                  </div>
                  {Object.entries(editedRole.skills).filter(([,v])=>v>0).map(([s,v])=>(
                    <div key={s} style={{marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",
                        marginBottom:6,fontSize:13}}>
                        <span>{s}</span>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <span style={{color:editedRole.color,fontWeight:700}}>{v}</span>
                          <button style={{background:"none",border:"none",
                            color:"var(--comment)",cursor:"pointer",fontSize:14}}
                            onClick={()=>setRoles(rs=>rs.map(r=>r.id===editedRole.id
                              ?{...r,skills:Object.fromEntries(
                                Object.entries(r.skills).filter(([k])=>k!==s))}
                              :r))}>✕</button>
                        </div>
                      </div>
                      <input type="range" min="1" max="10" value={v}
                        style={{accentColor:editedRole.color}}
                        onChange={e=>setRoles(rs=>rs.map(r=>r.id===editedRole.id
                          ?{...r,skills:{...r.skills,[s]:+e.target.value}}:r))}/>
                    </div>
                  ))}
                  {/* Add skill to existing role */}
                  <div style={{display:"flex",gap:8,marginTop:16,marginBottom:20}}>
                    <input className="input" placeholder="New skill"
                      value={editSkill.name}
                      onChange={e=>setEditSkill(p=>({...p,name:e.target.value}))}
                      style={{flex:2}}/>
                    <input type="number" className="input" min="1" max="10"
                      value={editSkill.value}
                      onChange={e=>setEditSkill(p=>({...p,value:+e.target.value}))}
                      style={{flex:1}}/>
                    <button className="btn btn-teal" style={{padding:"8px 14px"}}
                      onClick={()=>{
                        if(!editSkill.name.trim()) return;
                        setRoles(rs=>rs.map(r=>r.id===editedRole.id
                          ?{...r,skills:{...r.skills,[editSkill.name]:editSkill.value}}:r));
                        setEditSkill({name:"",value:7});
                      }}>+</button>
                  </div>
                  <button className="btn btn-primary btn-full"
                    onClick={()=>handleUpdateRole(editedRole)}>
                    💾 Save Changes
                  </button>
                </div>
              ) : (
                <div className="card" style={{textAlign:"center",
                  padding:"60px 20px",color:"var(--comment)"}}>
                  <div style={{fontSize:40,marginBottom:12}}>👈</div>
                  <div>Select a role to edit its required skills.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Users tab ── */}
        {tab === "users" && (
          <div className="card">
            <div style={{display:"flex",alignItems:"center",
              justifyContent:"space-between",marginBottom:20}}>
              <div className="section-title" style={{fontSize:15,marginBottom:0}}>
                Registered Users ({users.length})
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>#</th><th>Name</th><th>Email</th><th>Role</th>
                  <th>Joined</th><th>Action</th>
                </tr></thead>
                <tbody>
                  {users.map(u=>(
                    <tr key={u.id}>
                      <td style={{color:"var(--comment)"}}>{u.id}</td>
                      <td style={{fontWeight:600}}>{u.name}</td>
                      <td style={{color:"var(--sub)",fontSize:13}}>{u.email}</td>
                      <td><RolePill role={u.role}/></td>
                      <td style={{color:"var(--comment)",fontSize:12}}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        {u.id !== user.id && u.role !== "admin" ? (
                          <button className="btn btn-danger"
                            style={{fontSize:12,padding:"5px 12px"}}
                            onClick={()=>handleDeleteUser(u.id,u.name)}>
                            Delete
                          </button>
                        ) : (
                          <span style={{fontSize:12,color:"var(--comment)"}}>
                            {u.id === user.id ? "You" : "Protected"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
