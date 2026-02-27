import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ShellLayout } from "./layouts/ShellLayout";
import { LandingPage } from "./pages/LandingPage";
import { AuthLayout } from "./layouts/AuthLayout";
import { RegistrationPage } from "./pages/RegistrationPage";
import { EmployeeDashboardPage } from "./pages/EmployeeDashboardPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { useAuth } from "./context/AuthContext";

type View = "landing" | "login" | "register" | "employee" | "admin";

export default function App() {
  const appRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const [view, setView] = useState<View>("landing");

  useEffect(() => {
    if (!appRef.current) return;
    gsap.fromTo(
      appRef.current,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
    );
  }, []);

  // Redirect to appropriate dashboard when user is authenticated; to login when signed out.
  useEffect(() => {
    if (!user) {
      setView((prev) =>
        prev === "employee" || prev === "admin" ? "login" : prev
      );
      return;
    }
    setView(user.role === "ADMIN" ? "admin" : "employee");
  }, [user]);

  const handleGoToLogin = () => {
    setView("login");
  };

  const handleGoToRegister = () => {
    setView("register");
  };

  const handleGoToLanding = () => {
    setView("landing");
  };

  const isPublicView = view === "landing" || view === "login" || view === "register";

  return (
    <div ref={appRef} className="min-h-screen bg-slate-950 text-slate-50">
      <ShellLayout
        showHeader={view !== "landing"}
        onLogoClick={isPublicView ? handleGoToLanding : undefined}
      >
        {view === "landing" && (
          <LandingPage
            onGoToLogin={handleGoToLogin}
            onGoToRegister={handleGoToRegister}
          />
        )}
        {view === "login" && <AuthLayout onGoToRegister={handleGoToRegister} />}
        {view === "register" && (
          <RegistrationPage onSuccess={handleGoToLogin} />
        )}
        {view === "employee" && <EmployeeDashboardPage />}
        {view === "admin" && <AdminDashboardPage />}
      </ShellLayout>
    </div>
  );
}

