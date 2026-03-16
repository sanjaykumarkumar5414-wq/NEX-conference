import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import type { EmployeeSummary } from "../../api/admin";
import { getEmployees, sendWarning, setBlocked, deleteEmployee } from "../../api/admin";

export function EmployeeManagementPanel() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<EmployeeSummary | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const list = await getEmployees(token, search.trim() || undefined);
      setEmployees(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleWarning = async (emp: EmployeeSummary) => {
    if (!token) return;
    const msg = window.prompt(
      `Send warning to ${emp.name || emp.email}. Enter message:`,
      "Your recent booking activity has violated the conference room policy. Please contact HR."
    );
    if (!msg || !msg.trim()) return;
    try {
      await sendWarning(token, emp.id, msg.trim());
      alert("Warning email sent.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send warning.");
    }
  };

  const handleBlockToggle = async (emp: EmployeeSummary, blocked: boolean) => {
    if (!token) return;
    const confirmed = window.confirm(
      blocked
        ? `Block ${emp.name || emp.email} from creating new bookings?`
        : `Unblock ${emp.name || emp.email}?`
    );
    if (!confirmed) return;
    try {
      await setBlocked(token, emp.id, blocked);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update employee status.");
    }
  };

  const handleDeleteClick = (emp: EmployeeSummary) => {
    setDeleteConfirm(emp);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  const handleDeleteConfirm = async () => {
    if (!token || !deleteConfirm) return;
    try {
      await deleteEmployee(token, deleteConfirm.id);
      setEmployees((prev) => prev.filter((e) => e.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete employee.");
    }
  };

  return (
    <section
      id="employee-management"
      className="scroll-mt-4 space-y-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(15,23,42,0.55)] px-4 py-3 text-[11px]"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Employee Management</h2>
          <p className="text-xs text-slate-400">
            Manage employee booking access and send warning notifications.
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by Name, Employee ID, Email, or Project"
          className="w-full min-w-0 max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {error && (
        <p className="text-[11px] text-red-300">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-1 text-[11px]">
          <thead className="text-left text-slate-400">
            <tr>
              <th className="px-2 py-1 font-medium">Employee ID</th>
              <th className="px-2 py-1 font-medium">Employee Name</th>
              <th className="px-2 py-1 font-medium">Email</th>
              <th className="px-2 py-1 font-medium">Project</th>
              <th className="px-2 py-1 font-medium">Phone Number</th>
              <th className="px-2 py-1 font-medium">Manager Name</th>
              <th className="px-2 py-1 font-medium">Total Bookings</th>
              <th className="px-2 py-1 font-medium">Status</th>
              <th className="px-2 py-1 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-2 py-2 text-slate-400" colSpan={9}>
                  Loading…
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td className="px-2 py-2 text-slate-400" colSpan={9}>
                  No employees found.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="align-middle">
                  <td className="px-2 py-1 text-slate-200">{emp.employeeId}</td>
                  <td className="px-2 py-1 text-slate-100">{emp.name}</td>
                  <td className="px-2 py-1 text-slate-200">{emp.email}</td>
                  <td className="px-2 py-1 text-slate-200">{emp.project}</td>
                  <td className="px-2 py-1 text-slate-200">{emp.phoneNumber}</td>
                  <td className="px-2 py-1 text-slate-200">{emp.managerName}</td>
                  <td className="px-2 py-1 text-slate-200">{emp.totalBookings}</td>
                  <td className="px-2 py-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        emp.isBlocked
                          ? "bg-red-500/15 text-red-300 ring-1 ring-red-500/40"
                          : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40"
                      }`}
                    >
                      {emp.isBlocked ? "Blocked" : "Active"}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-right space-x-1">
                    {!emp.isBlocked && (
                      <button
                        type="button"
                        onClick={() => handleWarning(emp)}
                        className="inline-flex items-center rounded-full border border-yellow-500/70 bg-yellow-500/10 px-3 py-0.5 text-[10px] font-medium text-yellow-200 hover:bg-yellow-500/20"
                      >
                        Send Warning
                      </button>
                    )}
                    {emp.isBlocked ? (
                      <button
                        type="button"
                        onClick={() => handleBlockToggle(emp, false)}
                        className="inline-flex items-center rounded-full border border-emerald-500/70 bg-emerald-500/10 px-3 py-0.5 text-[10px] font-medium text-emerald-200 hover:bg-emerald-500/20"
                      >
                        Unblock User
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBlockToggle(emp, true)}
                        className="inline-flex items-center rounded-full border border-red-500/70 bg-red-500/10 px-3 py-0.5 text-[10px] font-medium text-red-200 hover:bg-red-500/20"
                      >
                        Block User
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(emp)}
                      className="inline-flex items-center rounded-full border px-3 py-0.5 text-[10px] font-medium hover:opacity-90"
                      style={{
                        borderColor: "#EF4444",
                        backgroundColor: "#EF4444",
                        color: "#fff"
                      }}
                    >
                      Delete User
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="mx-4 w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-xl">
            <h3 id="delete-dialog-title" className="text-sm font-semibold text-slate-100">
              Delete Employee
            </h3>
            <p className="mt-2 text-xs text-slate-400">
              Are you sure you want to permanently delete this employee? This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="inline-flex items-center rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-[10px] font-medium text-slate-200 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-medium text-white hover:opacity-90"
                style={{ backgroundColor: "#EF4444" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

