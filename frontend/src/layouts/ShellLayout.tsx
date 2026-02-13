import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import logoImg from "../../assets/logo.png";

interface ShellLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

export function ShellLayout({ children, showHeader = true }: ShellLayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      {showHeader && (
        <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <img
                src={logoImg}
                alt="NEX Conference Room"
                className="h-10 w-auto shrink-0"
              />
              <div>
                <p className="text-sm font-semibold tracking-wide text-slate-100">
                  NEX Conference Room
                </p>
                <p className="text-xs text-slate-400">
                  Booking Dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              {user ? (
                <>
                  <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-slate-200">
                    <span className="font-medium">{user.email}</span>
                    <span className="ml-2 text-slate-400">
                      {user.role === "ADMIN" ? "HR Admin" : "Employee"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-slate-200 transition hover:border-slate-500 hover:bg-slate-700"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-400">
                  Not signed in
                </span>
              )}
            </div>
          </div>
        </header>
      )}
      <main className="flex-1 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
        <div className="flex w-full px-0 py-0">{children}</div>
      </main>
    </div>
  );
}

