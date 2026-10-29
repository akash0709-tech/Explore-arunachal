// Thin controllers for /api/maps
import * as mapsService from "../services/maps.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";

const approximateMessage = (data) =>
  data.approximate ? "Road shape unavailable, showing straight lines" : "OK";

// GET /api/maps/route?from=&to=
export const route = asyncHandler(async (req, res) => {
  const data = await mapsService.getRouteGeometry(req.query.from, req.query.to);
  sendSuccess(res, { data, message: approximateMessage(data) });
});

// POST /api/maps/plan-geometry
export const planGeometry = asyncHandler(async (req, res) => {
  const data = await mapsService.getPlanGeometry(req.body.orderedStopIds);
  sendSuccess(res, { data, message: approximateMessage(data) });
});

// GET /api/maps/trip/:tripId
export const tripGeometry = asyncHandler(async (req, res) => {
  const data = await mapsService.getTripGeometry(req.user.id, req.params.tripId);
  sendSuccess(res, { data, message: approximateMessage(data) });
});

// GET /api/maps/geocode?q=
export const geocode = asyncHandler(async (req, res) => {
  const results = await mapsService.geocode(req.query.q);
  sendSuccess(res, { data: { results } });
});
