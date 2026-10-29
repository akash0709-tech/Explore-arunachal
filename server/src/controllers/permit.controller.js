// Thin controllers for /api/permits
import * as permitService from "../services/permit.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";

// GET /api/permits/check?citizen=indian&destinations=dirang,tawang
export const check = asyncHandler(async (req, res) => {
  const data = await permitService.checkPermits(req.query);
  sendSuccess(res, { data });
});
