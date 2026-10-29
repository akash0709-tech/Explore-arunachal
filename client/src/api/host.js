// /api/host: registration wizard and host dashboard (hosts only)
import { api, unwrap } from "./axios.js";

/** @returns {Promise<{ listingsCount: number, liveCount: number, views30d: number, contactTaps30d: number, pathStage: 1|2|3|4|5 }>} */
export const getHostDashboard = () => api.get("/host/dashboard").then(unwrap);

/** @param {{ page?: number, limit?: number }} [params] */
export const listMyHomestays = (params) => api.get("/host/homestays", { params }).then(unwrap);

/** @returns {Promise<{ id: string, status: "draft", currentStep: 1 }>} */
export const createDraft = () => api.post("/host/homestays").then(unwrap);

/**
 * The host's own draft or listing, including private fields and a `missing` list.
 * @param {string} id
 */
export const getMyHomestay = (id) => api.get(`/host/homestays/${id}`).then((r) => unwrap(r).homestay);

/**
 * Saves one wizard step (1-6). Steps 2 and 6 send an empty object.
 * @param {string} id
 * @param {1|2|3|4|5|6} step
 * @param {object} data
 */
export const saveStep = (id, step, data = {}) =>
  api.patch(`/host/homestays/${id}/step/${step}`, data).then((r) => unwrap(r).homestay);

/**
 * @param {string} id
 * @param {{ truthful: true, notGovtCertified: true }} declarations
 */
export const submitHomestay = (id, declarations) =>
  api.post(`/host/homestays/${id}/submit`, declarations).then((r) => unwrap(r).homestay);

/** @param {string} id  (drafts only) */
export const deleteDraft = (id) => api.delete(`/host/homestays/${id}`).then(() => undefined);

/** @param {string} id */
export const pauseListing = (id) => api.patch(`/host/homestays/${id}/pause`).then((r) => unwrap(r).homestay);

/** @param {string} id */
export const resumeListing = (id) =>
  api.patch(`/host/homestays/${id}/resume`).then((r) => unwrap(r).homestay);
