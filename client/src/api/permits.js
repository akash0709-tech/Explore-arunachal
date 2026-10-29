// /api/permits (public): powers the Permit Wizard
import { api, unwrap } from "./axios.js";

/**
 * Which permits does this traveller need for these places?
 * @param {{ citizen: "indian"|"foreign", destinations: string[] }} params  destination slugs
 * @returns {Promise<{ citizen: string, destinations: {slug: string, name: string}[],
 *   mainPermit: object|null, extraRules: object[], disclaimer: string }>}
 */
export const checkPermits = ({ citizen, destinations }) =>
  api.get("/permits/check", { params: { citizen, destinations: destinations.join(",") } }).then(unwrap);
