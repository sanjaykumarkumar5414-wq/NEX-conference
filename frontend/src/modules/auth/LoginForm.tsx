import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getBaseUrl } from "../../api/config";

type Role = "EMPLOYEE" | "ADMIN";

const NOT_REGISTERED_MESSAGE = "You are not registered. Please register first.";
const OTP_COOLDOWN_SECONDS = 60;

interface LoginFormProps {
  onGoToRegister?: () => void;
}

export function LoginForm({ onGoToRegister }: LoginFormProps) {
  const { login } = useAuth();
  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState<{ email: string; endsAt: number } | null>(null);
  const [otpCooldownRemaining, setOtpCooldownRemaining] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimmedEmail = email.trim().toLowerCase();
  const ALLOWED_DOMAINS = ["@nexware-global.com", "@nexgen-global.com"];
  const isCompanyEmail =
    trimmedEmail.length > 0 &&
    ALLOWED_DOMAINS.some((d) => trimmedEmail.endsWith(d));

  const isFormEmailValid = isCompanyEmail;

  const isCooldownActive = useMemo(() => {
    return Boolean(
      otpCooldown &&
        otpCooldown.email === trimmedEmail &&
        otpCooldownRemaining > 0
    );
  }, [otpCooldown, otpCooldownRemaining, trimmedEmail]);

  useEffect(() => {
    if (!otpCooldown) {
      setOtpCooldownRemaining(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((otpCooldown.endsAt - Date.now()) / 1000)
      );
      setOtpCooldownRemaining(remaining);
      if (remaining <= 0) {
        setOtpCooldown(null);
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [otpCooldown]);

  const resetMessages = () => {
    setMessage(null);
    setError(null);
  };

  const handleRoleChange = (nextRole: Role) => {
    if (nextRole === role) return;
    setRole(nextRole);
    if (nextRole === "ADMIN") {
      setEmail("hr@nexware-global.com");
    } else {
      setEmail("");
    }
    resetMessages();
    setPassword("");
    setOtp("");
    setOtpSent(false);
    setSendingOtp(false);
    setOtpCooldown(null);
  };

  const validateCommon = () => {
    if (!email.trim()) {
      setError("Please enter your work email address.");
      return false;
    }
    if (!isCompanyEmail) {
      const isGmail = trimmedEmail.endsWith("@gmail.com");
      const friendlyDomainMessage = isGmail
        ? "Gmail addresses are not allowed. Please use your company work email (nexware-global.com or nexgen-global.com)."
        : "Only nexware-global.com and nexgen-global.com work email addresses are allowed.";
      setError(friendlyDomainMessage);
      return false;
    }
    return true;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    resetMessages();

    if (!validateCommon()) return;

    if (role === "ADMIN") {
      if (!password.trim()) {
        setError("Please enter your HR admin password.");
        return;
      }

      const baseUrl = getBaseUrl();

      void (async () => {
        try {
          const res = await fetch(`${baseUrl}/auth/admin/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: trimmedEmail, password })
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(
              data?.message ||
                "Unable to sign in as HR Admin. Please check your credentials."
            );
            return;
          }

          const data = (await res.json()) as {
            user: { id: string; email: string; fullName: string; role: Role };
            token: string;
          };

          login(data.user, data.token);
        } catch (err) {
          setError("Network error while contacting the authentication service.");
        }
      })();
    } else {
      // Enforce employee login only during office hours: 09:00–17:00.
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const START_MINUTES = 9 * 60; // 09:00
      const END_MINUTES = 17 * 60; // 17:00
      if (minutes < START_MINUTES || minutes >= END_MINUTES) {
        setError(
          "Employee login is allowed only during office hours (09:00 AM – 05:00 PM). Please try again during business hours."
        );
        return;
      }

      if (!otpSent) {
        setError("Please send an OTP to your company email first.");
        return;
      }
      if (!otp.trim()) {
        setError("Enter the 6-digit OTP you received by email.");
        return;
      }

      const baseUrl = getBaseUrl();

      void (async () => {
        try {
          const res = await fetch(`${baseUrl}/auth/employee/verify-otp`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: trimmedEmail, otp })
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(
              data?.message ||
                "Unable to verify OTP. The code may be invalid or expired."
            );
            return;
          }

          const data = (await res.json()) as {
            user: { id: string; email: string; fullName: string; role: Role };
            token: string;
          };

          login(data.user, data.token);
        } catch (err) {
          setError("Network error while verifying your OTP.");
        }
      })();
    }
  };

  const handleSendOtp = () => {
    resetMessages();
    if (!validateCommon()) return;

    if (isCooldownActive) {
      setError("Please wait before requesting another OTP.");
      return;
    }
    if (sendingOtp) return;

    const baseUrl = getBaseUrl();

    void (async () => {
      setSendingOtp(true);
      try {
        const res = await fetch(`${baseUrl}/auth/employee/request-otp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email: trimmedEmail })
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(
            data?.message ||
              "We couldn't send an OTP right now. Please try again."
          );
          return;
        }

        setOtpSent(true);
        setMessage("OTP sent to your company email.");
        setOtpCooldown({
          email: trimmedEmail,
          endsAt: Date.now() + OTP_COOLDOWN_SECONDS * 1000
        });
      } catch {
        setError("Network error while requesting an OTP.");
      } finally {
        setSendingOtp(false);
      }
    })();
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/40">
      <form
        className="space-y-4"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2 text-sm">
          <p className="text-slate-200">Role</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleRoleChange("EMPLOYEE")}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                role === "EMPLOYEE"
                  ? "border-brand bg-brand/10 text-slate-50"
                  : "border-slate-700 bg-slate-900 text-slate-200 hover:border-brand/70 hover:bg-slate-900/80"
              }`}
            >
              Employee
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("ADMIN")}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                role === "ADMIN"
                  ? "border-brand bg-brand/10 text-slate-50"
                  : "border-slate-700 bg-slate-900 text-slate-200 hover:border-brand/70 hover:bg-slate-900/80"
              }`}
            >
              HR Admin
            </button>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <label className="block text-slate-200" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={role === "ADMIN"}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="Enter your work email"
          />
        </div>

        {role === "ADMIN" && (
          <div className="space-y-2 text-sm">
            <label className="block text-slate-200" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="••••••••"
            />
          </div>
        )}

        {role === "EMPLOYEE" && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="OTP"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                disabled={!otpSent}
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={!isFormEmailValid || sendingOtp || isCooldownActive}
                className="shrink-0 rounded-lg border border-brand/60 bg-brand/10 px-3 py-2 text-xs font-medium text-brand hover:bg-brand/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
              >
                {sendingOtp
                  ? "Sending…"
                  : isCooldownActive
                    ? `Resend OTP in ${otpCooldownRemaining}s`
                    : "Send OTP"}
              </button>
            </div>
            {!otpSent && (
              <p className="text-[11px] text-slate-500">
                Request a code to your company email, then enter it above.
              </p>
            )}
          </div>
        )}

        {(error || message) && (
          <div className="space-y-2">
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                error
                  ? "border-red-500/60 bg-red-500/10 text-red-200"
                  : "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {error ?? message}
            </div>
            {error === NOT_REGISTERED_MESSAGE && onGoToRegister && (
              <button
                type="button"
                onClick={onGoToRegister}
                className="w-full rounded-lg border border-brand/60 bg-brand/10 px-3 py-2 text-sm font-medium text-brand hover:bg-brand/20 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Register Now
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={
            !isFormEmailValid ||
            (role === "EMPLOYEE" && !otpSent)
          }
          className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white shadow-lg shadow-brand/40 transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          {role === "ADMIN" ? "Sign in" : "Verify & continue"}
        </button>
      </form>
    </div>
  );
}
