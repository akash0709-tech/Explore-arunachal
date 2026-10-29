// Thin controllers for the public /api/stays endpoints
import * as stayService from "../services/stay.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";

// GET /api/stays
export const list = asyncHandler(async (req, res) => {
  const data = await stayService.listStays(req.query);
  sendSuccess(res, { data });
});

// GET /api/stays/:id
export const getOne = asyncHandler(async (req, res) => {
  const stay = await stayService.getStay(req.params.id, req);
  sendSuccess(res, { data: { stay } });
});

// POST /api/stays/:id/contact-tap
export const contactTap = asyncHandler(async (req, res) => {
  const data = await stayService.recordContactTap(req.params.id, req.body.channel, req);
  sendSuccess(res, { data });
});

// POST /api/stays/:id/report
export const report = asyncHandler(async (req, res) => {
  const data = await stayService.reportStay(req.params.id, req.user, req.body);
  sendSuccess(res, { statusCode: 201, data, message: "Thank you. Our team will review this listing." });
});
