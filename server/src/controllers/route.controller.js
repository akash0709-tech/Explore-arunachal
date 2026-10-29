// Thin controllers for /api/routes
import * as routeService from "../services/route.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";

// GET /api/routes/graph
export const graph = asyncHandler(async (_req, res) => {
  const data = await routeService.getRouteGraph();
  sendSuccess(res, { data });
});
