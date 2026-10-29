// Thin controllers for /api/destinations
import * as destinationService from "../services/destination.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";

// GET /api/destinations
export const list = asyncHandler(async (req, res) => {
  const data = await destinationService.listDestinations(req.query);
  sendSuccess(res, { data });
});

// GET /api/destinations/:slug
export const getBySlug = asyncHandler(async (req, res) => {
  const destination = await destinationService.getDestinationBySlug(req.params.slug);
  sendSuccess(res, { data: { destination } });
});
