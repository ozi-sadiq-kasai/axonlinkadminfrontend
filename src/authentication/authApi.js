const API_BASE_URL = (import.meta.env.VITE_ADMIN_API_URL || "http://localhost:5040").replace(/\/$/, "");
export const listDeletionRequests = (status = "", page = 1) => request(`/api/deletion-requests?${new URLSearchParams({ status, page: String(page) })}`, { authenticated: true });
export const getDeletionRequest = id => request(`/api/deletion-requests/${encodeURIComponent(id)}`, { authenticated: true });
export const updateDeletionRequest = (id, body) => request(`/api/deletion-requests/${encodeURIComponent(id)}`, { method: "PATCH", body, authenticated: true });

function isLocalApiUrl(value) {
  return /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(value);
}

let accessToken = "";
let currentAdmin = null;
const REQUEST_TIMEOUT_MS = 15000;
const RETRY_DELAYS_MS = [400, 1000];

const emitNetworkState = (online) => window.dispatchEvent(new CustomEvent("axonlink:network", { detail: { online } }));

async function fetchWithResilience(url, options, retryable, timeoutMs = REQUEST_TIMEOUT_MS) {
  let lastError;
  const attempts = retryable ? RETRY_DELAYS_MS.length + 1 : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      emitNetworkState(true);
      if (retryable && response.status >= 500 && attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
        continue;
      }
      return response;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      emitNetworkState(false);
      if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
  throw lastError;
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function readResponse(response) {
  if (response.status === 204) return null;
  if (response.status === 429) {
    throw new ApiError("Too many requests were made. Please wait a few minutes before trying again.", 429);
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const responseText = (await response.text()).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const safeMessage = responseText && responseText.length <= 240
      ? responseText
      : `The admin service returned a non-JSON response (HTTP ${response.status}).`;
    throw new ApiError(safeMessage, response.status);
  }
  return response.json();
}

async function request(path, { method = "GET", body, authenticated = false, retry = true, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (authenticated && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response;
  try {
    response = await fetchWithResilience(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    }, method === "GET", timeoutMs);
  } catch (error) {
    if (error?.name === "AbortError" || error?.name === "TimeoutError") throw new ApiError("The request timed out while waiting for Axonlink. Please retry.", 0);
    const message = isLocalApiUrl(API_BASE_URL)
      ? "The local Axonlink Admin service is not available yet. Start the Admin backend, then try again."
      : "Unable to reach the Axonlink Admin service. Please try again.";
    throw new ApiError(message, 0);
  }

  if (response.status === 401 && authenticated && retry) {
    const restored = await refreshSession().catch(() => null);
    if (restored) return request(path, { method, body, authenticated, retry: false, timeoutMs });
  }

  const payload = await readResponse(response);
  if (!response.ok) {
    const message = response.status === 429
      ? "Too many requests were made. Please wait a few minutes before trying again."
      : payload?.message || "The request could not be completed.";
    throw new ApiError(message, response.status, payload?.errors);
  }
  return payload;
}

function acceptSession(payload) {
  accessToken = payload?.accessToken || "";
  currentAdmin = payload?.admin || null;
  return currentAdmin;
}

export async function loginAdmin(email, password) {
  const payload = await request("/api/auth/login", { method: "POST", body: { email, password } });
  acceptSession(payload);
  return payload;
}

export async function signupAdmin({ email, firstName, lastName, password, inviteToken }) {
  const payload = await request("/api/auth/signup", {
    method: "POST",
    body: { email, firstName, lastName, password, inviteToken },
  });
  acceptSession(payload);
  return payload;
}

export async function requestPasswordReset(email) {
  return request("/api/auth/forgot-password", { method: "POST", body: { email } });
}

export async function verifyPasswordResetCode(email, code) {
  return request("/api/auth/verify-reset-code", { method: "POST", body: { email, code } });
}

export async function resetAdminPassword(resetToken, password) {
  return request("/api/auth/reset-password", { method: "POST", body: { resetToken, password } });
}

export async function refreshSession() {
  const payload = await request("/api/auth/refresh", { method: "POST", retry: false });
  acceptSession(payload);
  return currentAdmin;
}

export async function getCurrentAdmin() {
  if (!accessToken) await refreshSession();
  const payload = await request("/api/auth/me", { authenticated: true });
  currentAdmin = payload.admin;
  return currentAdmin;
}

export async function logoutAdmin() {
  await request("/api/auth/logout", { method: "POST" }).catch(() => null);
  accessToken = "";
  currentAdmin = null;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getAdminManagementOverview() {
  return request("/api/admins/overview", { authenticated: true });
}

export function getAdminProfile(id) {
  return request(`/api/admins/${encodeURIComponent(id)}`, { authenticated: true });
}

export function updateManagedAdmin(id, changes) {
  return request(`/api/admins/${encodeURIComponent(id)}`, { method: "PATCH", body: changes, authenticated: true });
}

export function sendManagedAdminPasswordReset(id) {
  return request(`/api/admins/${encodeURIComponent(id)}/password-reset`, { method: "POST", authenticated: true });
}

export function createAdminInvitation(details) {
  return request("/api/auth/invitations", { method: "POST", body: details, authenticated: true });
}

export function getAppPatients({ page = 1, search = "" } = {}) {
  const query = new URLSearchParams({ page: String(page), limit: "20" });
  if (search) query.set("search", search);
  return request(`/api/app/patients?${query}`, { authenticated: true });
}

export function getAppPatient(patientId) {
  return request(`/api/app/patients/${encodeURIComponent(patientId)}`, { authenticated: true });
}

export function getAppSpecialists({ page = 1, search = "" } = {}) {
  const query = new URLSearchParams({ page: String(page), limit: "20" });
  if (search) query.set("search", search);
  return request(`/api/app/specialists?${query}`, { authenticated: true });
}

export function getAppSpecialist(clinicianId) {
  return request(`/api/app/specialists/${encodeURIComponent(clinicianId)}`, { authenticated: true });
}

export function reviewAppSpecialistDocument(clinicianId, documentType, details) {
  return request(`/api/app/specialists/${encodeURIComponent(clinicianId)}/documents/${encodeURIComponent(documentType)}/review`, { method: "POST", body: details, authenticated: true });
}

export function getAppFacilities({ page = 1, search = "" } = {}) { const query = new URLSearchParams({ page: String(page), limit: "20" }); if (search) query.set("search", search); return request(`/api/app/facilities?${query}`, { authenticated: true }); }
export function getAppFacility(facilityId) { return request(`/api/app/facilities/${encodeURIComponent(facilityId)}`, { authenticated: true }); }
export function reviewAppFacilityDocument(facilityId, affiliationId, details) { return request(`/api/app/facilities/${encodeURIComponent(facilityId)}/documents/${encodeURIComponent(affiliationId)}/review`, { method: "POST", body: details, authenticated: true }); }
export function reviewAppFacility(facilityId, details) { return request(`/api/app/facilities/${encodeURIComponent(facilityId)}/review`, { method: "POST", body: details, authenticated: true }); }
export function getAppActivities({ page = 1, tab = "APPOINTMENT" } = {}) { const query = new URLSearchParams({ page: String(page), limit: "20", tab }); return request(`/api/app/activities?${query}`, { authenticated: true }); }
export function getAppActivityAppointment(appointmentId) { return request(`/api/app/activities/appointments/${encodeURIComponent(appointmentId)}`, { authenticated: true }); }
export function endAppActivityConsultation(appointmentId) { return request(`/api/app/activities/appointments/${encodeURIComponent(appointmentId)}/end`, { method: "POST", authenticated: true }); }
export function getAppReferrals({ page = 1 } = {}) { const query = new URLSearchParams({ page: String(page), limit: "20" }); return request(`/api/app/referrals?${query}`, { authenticated: true }); }
export function getAppReferral(referralId) { return request(`/api/app/referrals/${encodeURIComponent(referralId)}`, { authenticated: true }); }

export function grantAppPatientRecordAccess(patientId, grantId, details) {
  return request(`/api/app/patients/${encodeURIComponent(patientId)}/access-grants/${encodeURIComponent(grantId)}/grant`, { method: "POST", body: details, authenticated: true });
}

export function denyAppPatientRecordAccess(patientId, grantId, reason) {
  return request(`/api/app/patients/${encodeURIComponent(patientId)}/access-grants/${encodeURIComponent(grantId)}/deny`, { method: "POST", body: { reason }, authenticated: true });
}

export function revokeAppPatientRecordAccess(patientId, grantId, reason) {
  return request(`/api/app/patients/${encodeURIComponent(patientId)}/access-grants/${encodeURIComponent(grantId)}/revoke`, { method: "POST", body: { reason }, authenticated: true });
}

export function suspendAppUser(userId, details) {
  return request(`/api/app/users/${encodeURIComponent(userId)}/suspensions`, { method: "POST", body: details, authenticated: true });
}

export function liftAppUserSuspension(userId) {
  return request(`/api/app/users/${encodeURIComponent(userId)}/suspension`, { method: "DELETE", authenticated: true });
}

export function resetAppUserAccess(userId) {
  return request(`/api/app/users/${encodeURIComponent(userId)}/reset-access`, { method: "POST", authenticated: true });
}

export function getSystemControl() {
  return request("/api/system-control", { authenticated: true });
}

export function updateSystemControl(changes) {
  return request("/api/system-control", { method: "PATCH", body: changes, authenticated: true });
}
export function getCommunications({ page = 1, tab = "ALL" } = {}) { const query = new URLSearchParams({ page: String(page), limit: "20", tab }); return request(`/api/communications?${query}`, { authenticated: true }); }
export function getCommunication(id) { return request(`/api/communications/${encodeURIComponent(id)}`, { authenticated: true }); }
export function createCommunication(details) { return request("/api/communications", { method: "POST", body: details, authenticated: true }); }
export function updateCommunication(id, details) { return request(`/api/communications/${encodeURIComponent(id)}`, { method: "PATCH", body: details, authenticated: true }); }
export function deleteCommunication(id) { return request(`/api/communications/${encodeURIComponent(id)}`, { method: "DELETE", authenticated: true }); }
export function cancelCommunication(id) { return request(`/api/communications/${encodeURIComponent(id)}/cancel`, { method: "POST", authenticated: true }); }
export function retryCommunication(id) { return request(`/api/communications/${encodeURIComponent(id)}/retry`, { method: "POST", authenticated: true }); }
export function getMyAdminProfile() { return request("/api/profile", { authenticated: true }); }
export function updateMyAdminProfile(data) { return request("/api/profile", { method:"PATCH", body:data, authenticated:true }); }
export function changeMyAdminPassword(data) { return request("/api/profile/password", { method:"POST", body:data, authenticated:true }); }
export function startAdminTwoFactor(method) { return request("/api/profile/two-factor/start", { method:"POST", body:{method}, authenticated:true }); }
export function verifyAdminTwoFactor(code) { return request("/api/profile/two-factor/verify", { method:"POST", body:{code}, authenticated:true }); }
export function disableAdminTwoFactor() { return request("/api/profile/two-factor", { method:"DELETE", authenticated:true }); }
export function revokeAdminSession(id) { return request(`/api/profile/sessions/${encodeURIComponent(id)}`, { method:"DELETE", authenticated:true }); }
export function getAdminNotifications(mode="ALL") { return request(`/api/profile/notifications?mode=${mode}`, { authenticated:true }); }
export function readAdminNotification(id) { return request(`/api/profile/notifications/${encodeURIComponent(id)}/read`, { method:"PATCH", authenticated:true }); }
export function deleteAdminNotification(id) { return request(`/api/profile/notifications/${encodeURIComponent(id)}`, { method:"DELETE", authenticated:true }); }
export function getAppReports() { return request("/api/app/reports", { authenticated:true }); }

export function getDashboard() {
  return request("/api/app/dashboard", { authenticated: true, timeoutMs: import.meta.env.DEV ? 40000 : 25000 });
}

export function getClassificationRequests(status = "PENDING_REVIEW") {
  return request(`/api/app/classification-requests?status=${encodeURIComponent(status)}`, { authenticated: true });
}
export function reviewClassificationRequest(id, details) {
  return request(`/api/app/classification-requests/${encodeURIComponent(id)}/review`, { method: 'POST', body: details, authenticated: true });
}

export function getClassificationRequest(id) {
  return request(`/api/app/classification-requests/${encodeURIComponent(id)}`, { authenticated:true });
}

export function getAppAlliedMedicalOfficers() { return request("/api/app/allied-medical-officers", { authenticated: true }); }
export function getAppAlliedMedicalOfficer(id) { return request(`/api/app/allied-medical-officers/${encodeURIComponent(id)}`, { authenticated: true }); }
export function reviewAppAlliedMedicalOfficer(id, details) { return request(`/api/app/allied-medical-officers/${encodeURIComponent(id)}/review`, { method: "POST", body: details, authenticated: true }); }
