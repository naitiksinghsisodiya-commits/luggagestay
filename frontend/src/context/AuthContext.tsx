import * as React from "react";
import { api } from "@/api/client";
import type { User, Role } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { name: string; email: string; password: string; phone?: string; role: Role }) => Promise<User>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(() => {
    const raw = localStorage.getItem("ls_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading] = React.useState(false);

  const persist = (token: string, user: User) => {
    localStorage.setItem("ls_token", token);
    localStorage.setItem("ls_user", JSON.stringify(user));
    setUser(user);
  };

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    persist(data.token, data.user);
    return data.user as User;
  };

  const register = async (payload: { name: string; email: string; password: string; phone?: string; role: Role }) => {
    const { data } = await api.post("/auth/register", payload);
    persist(data.token, data.user);
    return data.user as User;
  };

  const logout = () => {
    localStorage.removeItem("ls_token");
    localStorage.removeItem("ls_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
