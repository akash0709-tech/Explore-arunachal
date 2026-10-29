// Zod schemas for /api/destinations
import { z } from "zod";
import { booleanString, slugSchema, paginationQuery } from "./common.validator.js";

// GET /api/destinations?q=taw&isStartCity=true&includeWaypoints=true&page=1&limit=50
export const listDestinationsQuery = z.object({
  q: z.string().trim().max(60).optional(),
  isStartCity: booleanString.optional(),
  includeWaypoints: booleanString.optional(),
  ...paginationQuery
});

// GET /api/destinations/:slug
export const destinationSlugParams = z.object({ slug: slugSchema });
