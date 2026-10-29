// Thin controllers for /api/trips
import * as tripService from "../services/trip.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";

// POST /api/trips/plan  (preview only, nothing is saved)
export const preview = asyncHandler(async (req, res) => {
  const data = await tripService.previewTrip(req.body);
  sendSuccess(res, { data, message: "Plan ready (not saved)" });
});

// POST /api/trips
export const create = asyncHandler(async (req, res) => {
  const trip = await tripService.createTrip(req.user.id, req.body);
  sendSuccess(res, { statusCode: 201, data: { trip }, message: "Trip saved" });
});

// GET /api/trips
export const list = asyncHandler(async (req, res) => {
  const data = await tripService.listTrips(req.user.id, req.query);
  sendSuccess(res, { data });
});

// GET /api/trips/:id
export const getOne = asyncHandler(async (req, res) => {
  const trip = await tripService.getTrip(req.user.id, req.params.id);
  sendSuccess(res, { data: { trip } });
});

// PATCH /api/trips/:id
export const update = asyncHandler(async (req, res) => {
  const trip = await tripService.updateTrip(req.user.id, req.params.id, req.body);
  sendSuccess(res, { data: { trip }, message: "Trip updated" });
});

// DELETE /api/trips/:id
export const remove = asyncHandler(async (req, res) => {
  await tripService.deleteTrip(req.user.id, req.params.id);
  sendSuccess(res, { message: "Trip deleted" });
});
