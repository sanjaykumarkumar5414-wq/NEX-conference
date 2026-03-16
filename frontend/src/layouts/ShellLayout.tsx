import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import logoImg from "../../assets/logo.png";

interface ShellLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  onLogoClick?: () => void;
}

export function ShellLayout({
  children,
  showHeader = true,
  onLogoClick
}: ShellLayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      {showHeader && (
        <header className="border-b border-slate-800 bg-transparent backdrop-blur">
          <div className="flex w-full flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <img
                src={logoImg}
                alt="NEX Conference Room"
                className={`h-10 w-auto shrink-0 ${
                  onLogoClick ? "cursor-pointer" : ""
                }`}
                onClick={onLogoClick}
              />
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-100 sm:text-sm">
                  NEX Conference Room
                </p>
                <p className="text-[11px] text-slate-400 sm:text-xs">
                  Booking Dashboard
                </p>
              </div>
            </div>
            <div className="flex w-full items-center justify-between gap-2 text-[11px] sm:w-auto sm:justify-end sm:gap-3 sm:text-xs">
              {user ? (
                <>
                  {user.role === "ADMIN" && (
                    <a
                      href="#employee-management"
                      className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 sm:text-xs"
                    >
                      Employee Management
                    </a>
                  )}
                  <span className="max-w-full flex-1 truncate rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-slate-200 sm:flex-initial">
                    <span className="font-medium">{user.email}</span>
                    <span className="ml-2 hidden text-slate-400 sm:inline">
                      {user.role === "ADMIN" ? "HR Admin" : "Employee"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={logout}
                    className="shrink-0 rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-[11px] text-slate-200 transition hover:border-slate-500 hover:bg-slate-700 sm:text-xs"
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

