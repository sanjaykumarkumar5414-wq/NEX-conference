import { useState, type FormEvent } from "react";

const PROJECT_OPTIONS = ["Fuso", "Infra", "Testing", "HR", "Rakuten", "other"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RegistrationPageProps {
  onSuccess: () => void;
}

export function RegistrationPage({ onSuccess }: RegistrationPageProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [project, setProject] = useState("");
  const [specifyProject, setSpecifyProject] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [managerName, setManagerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isProjectOther = project === "other";
  const projectValue = isProjectOther ? specifyProject.trim() : project;

  const validate = (): boolean => {
    setError(null);
    if (!employeeId.trim()) {
      setError("Employee ID is required.");
      return false;
    }
    if (!name.trim()) {
      setError("Employee Name is required.");
      return false;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return false;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Email must be a valid format.");
      return false;
    }
    if (!email.trim().toLowerCase().endsWith("@nexware-global.com")) {
      setError("Only nexware-global.com email addresses are allowed.");
      return false;
    }
    if (!project.trim()) {
      setError("Project is required.");
      return false;
    }
    if (isProjectOther && !specifyProject.trim()) {
      setError("Please specify the project.");
      return false;
    }
    if (!phoneNumber.trim()) {
      setError("Phone Number is required.");
      return false;
    }
    if (!managerName.trim()) {
      setError("Manager Name is required.");
      return false;
    }
    return true;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    setError(null);

    const baseUrl =
      (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:4000/api";

    fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: employeeId.trim(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        project: projectValue,
        phone_number: phoneNumber.trim(),
        manager_name: managerName.trim()
      })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.message ?? "Registration failed. Please try again.");
          return;
        }
        setSuccessMessage(
          data?.message ?? "Registration successful. Please login using OTP."
        );
        setTimeout(() => {
          onSuccess();
        }, 1500);
      })
      .catch(() => {
        setError("Network error. Please try again.");
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <section className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-950 px-4 py-10 text-slate-50">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-slate-100">Conference Room</h1>
        <p className="mt-1 text-xs text-slate-400">Employee registration</p>
      </div>
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/40">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2 text-sm">
            <label className="block text-slate-200" htmlFor="employee_id">
              Employee ID <span className="text-red-400">*</span>
            </label>
            <input
              id="employee_id"
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="Employee ID"
            />
          </div>
          <div className="space-y-2 text-sm">
            <label className="block text-slate-200" htmlFor="name">
              Employee Name <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="Full name"
            />
          </div>
          <div className="space-y-2 text-sm">
            <label className="block text-slate-200" htmlFor="email">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="you@nexware-global.com"
            />
          </div>
          <div className="space-y-2 text-sm">
            <label className="block text-slate-200" htmlFor="project">
              Project <span className="text-red-400">*</span>
            </label>
            <select
              id="project"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">Select project</option>
              {PROJECT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          {isProjectOther && (
            <div className="space-y-2 text-sm">
              <label className="block text-slate-200" htmlFor="specify_project">
                Specify Project <span className="text-red-400">*</span>
              </label>
              <input
                id="specify_project"
                type="text"
                value={specifyProject}
                onChange={(e) => setSpecifyProject(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                placeholder="Enter project name"
              />
            </div>
          )}
          <div className="space-y-2 text-sm">
            <label className="block text-slate-200" htmlFor="phone">
              Phone Number <span className="text-red-400">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="Phone number"
            />
          </div>
          <div className="space-y-2 text-sm">
            <label className="block text-slate-200" htmlFor="manager_name">
              Manager Name <span className="text-red-400">*</span>
            </label>
            <input
              id="manager_name"
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="Manager name"
            />
          </div>
          {(error || successMessage) && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                error
                  ? "border-red-500/60 bg-red-500/10 text-red-200"
                  : "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {error ?? successMessage}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white shadow-lg shadow-brand/40 transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {submitting ? "Registering…" : "Register"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">
          Already registered?{" "}
          <button
            type="button"
            onClick={onSuccess}
            className="text-brand hover:underline"
          >
            Go to login
          </button>
        </p>
      </div>
    </section>
  );
}
