/**
 * Bookings API — same endpoints for both Employee and HR dashboards.
 */

import { triggerUnauthorized } from "./authCallback";

const getBaseUrl = () =>
  (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ?? "http://localhost:4000/api";

export interface Booking {
  id: string;
  roomId: string;
  requesterId: string;
  requesterEmail: string;
  requesterName: string;
  title: string;
  purpose: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  type: "REQUEST" | "EMERGENCY" | "BLOCK";
  isEmergency: boolean;
  createdAt: string;
  notes?: string;
  approverId?: string;
  rejectionReason?: string;
  rescheduled?: boolean;
  rescheduleReason?: string;
  rescheduledAt?: string;
  rescheduledBy?: string;
}

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

export async function getBookings(token: string): Promise<Booking[]> {
  const res = await fetch(`${getBaseUrl()}/bookings`, {
    headers: authHeaders(token)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) triggerUnauthorized();
    throw new Error((data as { message?: string }).message ?? "Failed to fetch bookings.");
  }
  const data = (await res.json()) as { bookings: Booking[] };
  return data.bookings ?? [];
}

export async function createBooking(
  token: string,
  body: {
    title?: string;
    purpose?: string;
    startTime: string;
    endTime: string;
    roomId?: string;
    isEmergency?: boolean;
  }
): Promise<Booking> {
  const res = await fetch(`${getBaseUrl()}/bookings`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) triggerUnauthorized();
    throw new Error((data as { message?: string }).message ?? "Failed to create booking.");
  }
  return res.json() as Promise<Booking>;
}

export async function updateBookingStatus(
  token: string,
  bookingId: string,
  body: { status: "APPROVED" | "REJECTED"; reason?: string }
): Promise<Booking> {
  const res = await fetch(`${getBaseUrl()}/bookings/${bookingId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) triggerUnauthorized();
    throw new Error((data as { message?: string }).message ?? "Failed to update booking.");
  }
  return res.json() as Promise<Booking>;
}

export interface RescheduleBody {
  bookingId: string;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
  reason: string;
}

export interface RescheduleResponse {
  success: boolean;
  updatedBooking: Booking;
}

export async function rescheduleBooking(
  token: string,
  body: RescheduleBody
): Promise<RescheduleResponse> {
  const res = await fetch(`${getBaseUrl()}/bookings/reschedule`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) triggerUnauthorized();
    throw new Error((data as { message?: string }).message ?? "Failed to reschedule booking.");
  }
  return data as RescheduleResponse;
}

export interface AuditEntry {
  id: string;
  type: string;
  message: string;
  bookingId?: string | null;
  at: string;
  meta?: unknown;
}

export async function getAuditLog(token: string): Promise<AuditEntry[]> {
  const res = await fetch(`${getBaseUrl()}/admin/audit-log`, {
    headers: authHeaders(token)
  });
  if (!res.ok) {
    if (res.status === 401) triggerUnauthorized();
    return [];
  }
  const data = (await res.json()) as { entries: AuditEntry[] };
  return data.entries ?? [];
}
