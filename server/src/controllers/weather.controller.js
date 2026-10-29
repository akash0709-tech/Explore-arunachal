// Thin controllers for /api/weather
import * as weatherService from "../services/weather.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";

// GET /api/weather?lat=&lng=&days=
export const forecast = asyncHandler(async (req, res) => {
  const data = await weatherService.getForecast(req.query);
  sendSuccess(res, { data, message: data.stale ? "Showing the last saved forecast" : "OK" });
});

// GET /api/weather/destination/:slug
export const destinationForecast = asyncHandler(async (req, res) => {
  const data = await weatherService.getForecastForDestination(req.params.slug, req.query.days);
  sendSuccess(res, { data, message: data.stale ? "Showing the last saved forecast" : "OK" });
});
