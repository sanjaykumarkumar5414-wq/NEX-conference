import { triggerUnauthorized } from "./authCallback";

const getBaseUrl = () =>
  (import.meta as ImportMeta & { env: ImportMetaEnv & { VITE_API_BASE_URL?: string } }).env
    .VITE_API_BASE_URL ?? "/api";

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

export interface EmployeeSummary {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  project: string;
  phoneNumber: string;
  managerName: string;
  totalBookings: number;
  isBlocked: boolean;
}

export async function getEmployees(
  token: string,
  search?: string
): Promise<EmployeeSummary[]> {
  const base = getBaseUrl();
  const path = base.endsWith("/") ? `${base}admin/employees` : `${base}/admin/employees`;
  const query = search != null && search.trim() !== "" ? `?search=${encodeURIComponent(search.trim())}` : "";
  const res = await fetch(`${path}${query}`, {
    headers: authHeaders(token)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) triggerUnauthorized();
    throw new Error((data as { message?: string }).message ?? "Failed to load employees.");
  }
  const data = (await res.json()) as { employees: EmployeeSummary[] };
  return data.employees ?? [];
}

export async function sendWarning(
  token: string,
  employeeId: string,
  message: string
): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/admin/employees/${employeeId}/warn`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ message })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) triggerUnauthorized();
    throw new Error((data as { message?: string }).message ?? "Failed to send warning.");
  }
}

export async function setBlocked(
  token: string,
  employeeId: string,
  blocked: boolean
): Promise<void> {
  const path = blocked ? "block" : "unblock";
  const res = await fetch(`${getBaseUrl()}/admin/employees/${employeeId}/${path}`, {
    method: "POST",
    headers: authHeaders(token)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) triggerUnauthorized();
    throw new Error((data as { message?: string }).message ?? "Failed to update user status.");
  }
}

export async function deleteEmployee(
  token: string,
  employeeId: string
): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/admin/employees/${employeeId}`, {
    method: "DELETE",
    headers: authHeaders(token)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) triggerUnauthorized();
    throw new Error((data as { message?: string }).message ?? "Failed to delete employee.");
  }
}

