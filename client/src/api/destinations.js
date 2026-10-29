// /api/destinations (public)
import { api, unwrap } from "./axios.js";

/**
 * @typedef {{ _id: string, name: string, slug: string, district?: string, altitudeM?: number,
 *   location: { type: "Point", coordinates: [number, number] }, bestMonths: number[],
 *   coverImage?: { url: string, fileId: string }, isStartCity: boolean, isWaypoint: boolean,
 *   isSample: boolean }} DestinationCard
 */

/**
 * @param {{ q?: string, isStartCity?: boolean, includeWaypoints?: boolean, page?: number, limit?: number }} [params]
 * @returns {Promise<{ items: DestinationCard[], pagination: object }>}
 */
export const listDestinations = (params) => api.get("/destinations", { params }).then(unwrap);

/**
 * Full detail with permit rules and nearby places.
 * @param {string} slug e.g. "tawang"
 */
export const getDestination = (slug) =>
  api.get(`/destinations/${encodeURIComponent(slug)}`).then((r) => unwrap(r).destination);
