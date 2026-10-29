// /api/weather (public). Forecasts come from Open-Meteo through our API (cached for 3 h).
import { api, unwrap } from "./axios.js";

/**
 * @typedef {{ date: string, tempMaxC: number, tempMinC: number, precipitationMm: number,
 *   precipitationProbability: number, snowfallCm: number, label: string, icon: string,
 *   roadRisk: "low"|"medium"|"high" }} ForecastDay
 */

/**
 * @param {{ lat: number, lng: number, days?: number }} params
 * @returns {Promise<{ days: ForecastDay[], stale: boolean, fetchedAt: string }>}
 */
export const getForecast = (params) => api.get("/weather", { params }).then(unwrap);

/**
 * @param {string} slug
 * @param {number} [days=7]
 */
export const getDestinationForecast = (slug, days = 7) =>
  api.get(`/weather/destination/${encodeURIComponent(slug)}`, { params: { days } }).then(unwrap);
