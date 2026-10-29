// Zod schemas for /api/maps
import { z } from "zod";
import { objectIdSchema } from "./common.validator.js";

// GET /api/maps/route?from=<destinationId>&to=<destinationId>
export const routeQuery = z
  .object({ from: objectIdSchema, to: objectIdSchema })
  .refine((q) => q.from !== q.to, { message: "from and to must be different places", path: ["to"] });

// POST /api/maps/plan-geometry  { orderedStopIds: [start, ...destinations, start] }
export const planGeometryBody = z.object({
  orderedStopIds: z.array(objectIdSchema).min(2, "At least two stops are needed").max(12, "At most 12 stops")
});

// GET /api/maps/trip/:tripId
export const tripGeometryParams = z.object({ tripId: objectIdSchema });

// GET /api/maps/geocode?q=Dirang
export const geocodeQuery = z.object({
  q: z.string({ required_error: "q is required" }).trim().min(2, "Type at least 2 letters").max(80)
});
