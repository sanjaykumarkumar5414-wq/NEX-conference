import { createContext, useContext, useEffect, useRef, useState } from "react";
import { setOnUnauthorized } from "../api/authCallback";

type Role = "EMPLOYEE" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "conference_room_auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { user: AuthUser; token: string };
      if (parsed?.user && parsed?.token) {
        setUser(parsed.user);
        setToken(parsed.token);
      }
    } catch {
      // Ignore malformed storage
    }
  }, []);

  const login = (nextUser: AuthUser, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: nextUser, token: nextToken })
    );
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const logoutRef = useRef(logout);
  logoutRef.current = logout;
  useEffect(() => {
    setOnUnauthorized(() => logoutRef.current());
    return () => setOnUnauthorized(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

