import { createContext, useContext, useState, useEffect } from "react";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

const BASE = "http://localhost:8000/api";

/* shared fetch helper — used by all pages */
export async function apiCall(path, method = "GET", body = null, isForm = false) {
  const token   = localStorage.getItem("cv_token");
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) {
    if (isForm) {
      opts.body = body;                          // FormData — no Content-Type header
    } else {
      headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
  }
  const res  = await fetch(BASE + path, opts);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Request failed");
  return data.data;
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("cv_token")) { setLoading(false); return; }
    apiCall("/auth/me").then(setUser).catch(() => localStorage.removeItem("cv_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const d = await apiCall("/auth/login", "POST", { email, password });
    localStorage.setItem("cv_token", d.token);
    setUser(d.user);
    return d.user;
  };

  const logout = () => { localStorage.removeItem("cv_token"); setUser(null); };

  return (
    <Ctx.Provider value={{ user, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}
