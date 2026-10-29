// /api/maps: road shapes and place search. The OpenRouteService key stays on the server.
import { api, unwrap } from "./axios.js";

/**
 * @typedef {{ geometry: { type: "LineString", coordinates: [number, number][] }, distanceKm: number,
 *   approximate: boolean }} RouteGeometry
 */

/**
 * @param {string} fromId
 * @param {string} toId
 * @returns {Promise<RouteGeometry & { from: object, to: object }>}
 */
export const getRouteGeometry = (fromId, toId) =>
  api.get("/maps/route", { params: { from: fromId, to: toId } }).then(unwrap);

/**
 * Whole itinerary line + markers, e.g. [start, ...destinations, start].
 * @param {string[]} orderedStopIds
 * @returns {Promise<RouteGeometry & { markers: object[], legs: object[] }>}
 */
export const getPlanGeometry = (orderedStopIds) =>
  api.post("/maps/plan-geometry", { orderedStopIds }).then(unwrap);

/** @param {string} tripId  (owner only) */
export const getTripGeometry = (tripId) => api.get(`/maps/trip/${tripId}`).then(unwrap);

/**
 * Place search in India (logged-in users, rate limited).
 * @param {string} q
 * @returns {Promise<{ label: string, name: string, region: string, lat: number, lng: number }[]>}
 */
export const geocode = (q) => api.get("/maps/geocode", { params: { q } }).then((r) => unwrap(r).results);
