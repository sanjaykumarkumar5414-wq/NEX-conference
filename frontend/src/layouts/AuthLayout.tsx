import { LoginForm } from "../modules/auth/LoginForm";

interface AuthLayoutProps {
  onGoToRegister?: () => void;
}

export function AuthLayout({ onGoToRegister }: AuthLayoutProps) {
  return (
    <section className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-950 px-4 py-10 text-slate-50">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-slate-100">Conference Room</h1>
        <p className="mt-1 text-xs text-slate-400">Sign in to manage bookings</p>
      </div>
      <LoginForm onGoToRegister={onGoToRegister} />
    </section>
  );
}
