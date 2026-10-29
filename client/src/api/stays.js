// /api/stays: public pages of verified (live) homestays
import { api, unwrap } from "./axios.js";

/**
 * @param {{ town?: string, maxPrice?: number, minRooms?: number, facilities?: string[], page?: number, limit?: number }} [params]
 */
export const listStays = ({ facilities, ...params } = {}) =>
  api
    .get("/stays", {
      params: { ...params, facilities: facilities?.length ? facilities.join(",") : undefined }
    })
    .then(unwrap);

/** @param {string} id */
export const getStay = (id) => api.get(`/stays/${id}`).then((r) => unwrap(r).stay);

/**
 * Counts a Call / WhatsApp tap (once per viewer per day).
 * @param {string} id
 * @param {"call"|"whatsapp"} channel
 */
export const recordContactTap = (id, channel) =>
  api.post(`/stays/${id}/contact-tap`, { channel }).then(unwrap);

/**
 * @param {string} id
 * @param {{ reason: "wrong_price"|"wrong_location_or_photos"|"host_unreachable"|"safety", note?: string }} body
 */
export const reportStay = (id, body) => api.post(`/stays/${id}/report`, body).then(unwrap);
