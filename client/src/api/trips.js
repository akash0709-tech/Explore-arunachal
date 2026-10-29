// /api/trips: Smart Itinerary preview and saved trips
import { api, unwrap } from "./axios.js";

/**
 * @typedef {{ citizen: "indian"|"foreign", startId: string, destinationIds: string[], days: number,
 *   travellers?: number, month: number, budgetPerPerson?: number, transportMode?: "shared"|"private",
 *   interests?: string[] }} TripInput
 */

/**
 * Plans a trip without saving it (works for guests too).
 * @param {TripInput} input
 * @returns {Promise<{ plan: object, permitSnapshot: object|null, extraPermits: object[], disclaimer: string, weather: object|null }>}
 */
export const previewTrip = (input) => api.post("/trips/plan", input).then(unwrap);

/**
 * Saves a trip. The server re-plans it; any plan sent from the browser is ignored.
 * @param {TripInput & { title?: string }} input
 */
export const createTrip = (input) => api.post("/trips", input).then((r) => unwrap(r).trip);

/** @param {{ page?: number, limit?: number }} [params] */
export const listTrips = (params) => api.get("/trips", { params }).then(unwrap);

/** @param {string} id */
export const getTrip = (id) => api.get(`/trips/${id}`).then((r) => unwrap(r).trip);

/**
 * Change choices (re-plans), rename, tick checklist items or save/remove a homestay.
 * @param {string} id
 * @param {Partial<TripInput> & { title?: string, checklist?: {id: string, done: boolean}[],
 *   addHostId?: string, removeHostId?: string, budgetPerPerson?: number|null }} changes
 */
export const updateTrip = (id, changes) => api.patch(`/trips/${id}`, changes).then((r) => unwrap(r).trip);

/** @param {string} id */
export const deleteTrip = (id) => api.delete(`/trips/${id}`).then(() => undefined);
