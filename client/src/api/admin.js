// /api/admin: tourism review team only. Every decision is audit-logged on the server.
import { api, unwrap } from "./axios.js";

export const getAdminDashboard = () => api.get("/admin/dashboard").then(unwrap);

/**
 * Approvals queue.
 * @param {{ status?: string, town?: string, q?: string, sort?: "oldest"|"newest", page?: number, limit?: number }} [params]
 */
export const listQueue = (params) => api.get("/admin/homestays", { params }).then(unwrap);

/** Full review data: details, host, document slots, missing items, history, reports. @param {string} id */
export const getReview = (id) => api.get(`/admin/homestays/${id}`).then(unwrap);

/**
 * @param {string} id
 * @param {{ decision: "approve"|"request_changes"|"reject", note?: string,
 *   checklist?: { certificate: string, proof: string, id: string, namesMatch: string, photosMatch: string } }} body
 *   checklist values: "valid" | "invalid" | "not_applicable"
 */
export const decide = (id, body) => api.post(`/admin/homestays/${id}/decision`, body).then(unwrap);

/** @param {string[]} ids */
export const bulkRemind = (ids) => api.post("/admin/homestays/bulk-remind", { ids }).then(unwrap);

/** @param {{ status?: "live"|"paused"|"suspended", page?: number }} [params] */
export const listHosts = (params) => api.get("/admin/hosts", { params }).then(unwrap);

/** @param {string} id @param {string} note */
export const suspendListing = (id, note) => api.post(`/admin/homestays/${id}/suspend`, { note }).then(unwrap);

/** @param {string} id @param {string} [note] */
export const reinstateListing = (id, note) =>
  api.post(`/admin/homestays/${id}/reinstate`, { note }).then(unwrap);

/** @param {string} id @param {string} note */
export const requestReverification = (id, note) =>
  api.post(`/admin/homestays/${id}/reverify`, { note }).then(unwrap);

/** @param {{ status?: "open"|"resolved", page?: number }} [params] */
export const listReports = (params) => api.get("/admin/reports", { params }).then(unwrap);

/**
 * @param {string} id
 * @param {{ action: "dismiss"|"suspend_listing", note?: string }} body
 */
export const resolveReport = (id, body) => api.post(`/admin/reports/${id}/resolve`, body).then(unwrap);

export const listPermitRules = () => api.get("/admin/permits").then((r) => unwrap(r).items);

/**
 * @param {string} id
 * @param {{ title?: string, whoNeedsIt?: string, documents?: string[], steps?: string[], officialUrl?: string, officialLabel?: string, notes?: string }} changes
 */
export const updatePermitRule = (id, changes) =>
  api.patch(`/admin/permits/${id}`, changes).then((r) => unwrap(r).rule);

/** Marks a rule as checked today against the official source. @param {string} id */
export const verifyPermitRule = (id) => api.post(`/admin/permits/${id}/verify`).then((r) => unwrap(r).rule);

/** @param {object} body  see server validators/admin.validator.js */
export const createDestination = (body) =>
  api.post("/admin/destinations", body).then((r) => unwrap(r).destination);

/** @param {string} id @param {object} changes */
export const updateDestination = (id, changes) =>
  api.patch(`/admin/destinations/${id}`, changes).then((r) => unwrap(r).destination);

/** @param {object} body  { fromId, toId, roadKm, hillHours, ... } */
export const createRoute = (body) => api.post("/admin/routes", body).then((r) => unwrap(r).route);

/** @param {string} id @param {object} changes */
export const updateRoute = (id, changes) =>
  api.patch(`/admin/routes/${id}`, changes).then((r) => unwrap(r).route);

/** @param {{ targetId?: string, page?: number }} [params] */
export const listAudit = (params) => api.get("/admin/audit", { params }).then(unwrap);
