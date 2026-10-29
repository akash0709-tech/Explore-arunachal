// Zod schemas for /api/weather
import { z } from "zod";
import { slugSchema } from "./common.validator.js";

const daysField = z.coerce.number().int().min(1).max(16).default(7); // Open-Meteo gives up to 16 days

// GET /api/weather?lat=27.59&lng=91.86&days=7
export const forecastQuery = z.object({
  lat: z.coerce.number({ invalid_type_error: "lat must be a number" }).min(-90).max(90),
  lng: z.coerce.number({ invalid_type_error: "lng must be a number" }).min(-180).max(180),
  days: daysField
});

// GET /api/weather/destination/:slug?days=7
export const destinationForecastParams = z.object({ slug: slugSchema });
export const destinationForecastQuery = z.object({ days: daysField });
