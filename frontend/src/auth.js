import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export const api = axios.create({ baseURL: BASE });

// Attach token to every request automatically
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem("sm_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("sm_token");
    const saved = localStorage.getItem("sm_user");
    if (token && saved) {
      setUser(JSON.parse(saved));
      // Verify token is still valid
      api.get("/api/auth/me")
        .then(r => { setUser(r.data); localStorage.setItem("sm_user", JSON.stringify(r.data)); })
        .catch(() => { logout(); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const r = await api.post("/api/auth/login", { email, password });
    localStorage.setItem("sm_token", r.data.token);
    localStorage.setItem("sm_user", JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data.user;
  };

  const register = async (name, email, password, role) => {
    const r = await api.post("/api/auth/register", { name, email, password, role });
    localStorage.setItem("sm_token", r.data.token);
    localStorage.setItem("sm_user", JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = () => {
    localStorage.removeItem("sm_token");
    localStorage.removeItem("sm_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// API helpers
export const getRoles        = ()         => api.get("/api/roles");
export const addRole         = (d)        => api.post("/api/roles", d);
export const updateRole      = (id, d)    => api.put(`/api/roles/${id}`, d);
export const deleteRole      = (id)       => api.delete(`/api/roles/${id}`);
export const submitAssess    = (d)        => api.post("/api/assess", d);
export const getMyAssessments= ()         => api.get("/api/assessments/mine");
export const getAllAssessments= ()         => api.get("/api/assessments");
export const getStats        = ()         => api.get("/api/stats");
export const getUsers        = ()         => api.get("/api/admin/users");
export const deleteUser      = (id)       => api.delete(`/api/admin/users/${id}`);


// Resume API
export const parseResume = (formData, role = "") => {
  const url = role ? `/api/resume/parse?role=${encodeURIComponent(role)}` : "/api/resume/parse";
  return api.post(url, formData, { headers: { "Content-Type": "multipart/form-data" } });
};
export const getAllRoleFits = (extractedSkills) =>
  api.post("/api/resume/fit", { extracted_skills: extractedSkills, target_role: "all" });
