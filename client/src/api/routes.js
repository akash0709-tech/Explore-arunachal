// /api/routes (public): the road network with our hill-adjusted drive hours
import { api, unwrap } from "./axios.js";

/**
 * @returns {Promise<{
 *   nodes: { _id: string, name: string, slug: string, altitudeM: number, location: object,
 *            isWaypoint: boolean, isPass: boolean, isStartCity: boolean }[],
 *   segments: { _id: string, fromId: string, toId: string, from: string, to: string, roadKm: number,
 *               hillHours: number, isPass: boolean, fares: object, isSample: boolean }[] }>}
 */
export const getRouteGraph = () => api.get("/routes/graph").then(unwrap);
