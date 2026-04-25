import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tok = localStorage.getItem("nv_token");
    if (!tok) { setLoading(false); return; }
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => {
      localStorage.removeItem("nv_token");
    }).finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    localStorage.setItem("nv_token", r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const sendOtp = async (phone) => api.post("/auth/otp/send", { phone });

  const verifyOtp = async (phone, otp, name) => {
    const r = await api.post("/auth/otp/verify", { phone, otp, name });
    localStorage.setItem("nv_token", r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = () => {
    localStorage.removeItem("nv_token");
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
