// Thin controllers for /api/host
import * as hostService from "../services/host.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";

// POST /api/host/homestays
export const createDraft = asyncHandler(async (req, res) => {
  const data = await hostService.createDraft(req.user.id);
  sendSuccess(res, { statusCode: 201, data, message: "Draft created" });
});

// GET /api/host/homestays/:id
export const getOne = asyncHandler(async (req, res) => {
  const homestay = await hostService.getOwnHomestay(req.user.id, req.params.id);
  sendSuccess(res, { data: { homestay } });
});

// PATCH /api/host/homestays/:id/step/:step
export const saveStep = asyncHandler(async (req, res) => {
  const homestay = await hostService.saveStep(req.user.id, req.params.id, req.params.step, req.body);
  sendSuccess(res, { data: { homestay }, message: `Step ${req.params.step} saved` });
});

// POST /api/host/homestays/:id/submit
export const submit = asyncHandler(async (req, res) => {
  const homestay = await hostService.submitForReview(req.user, req.params.id, req.body);
  sendSuccess(res, { data: { homestay }, message: "Submitted for review" });
});

// DELETE /api/host/homestays/:id
export const removeDraft = asyncHandler(async (req, res) => {
  await hostService.deleteDraft(req.user.id, req.params.id);
  sendSuccess(res, { message: "Draft deleted" });
});

// GET /api/host/dashboard
export const dashboard = asyncHandler(async (req, res) => {
  const data = await hostService.getDashboard(req.user.id);
  sendSuccess(res, { data });
});

// GET /api/host/homestays
export const listMine = asyncHandler(async (req, res) => {
  const data = await hostService.listMyHomestays(req.user.id, req.query);
  sendSuccess(res, { data });
});

// PATCH /api/host/homestays/:id/pause
export const pause = asyncHandler(async (req, res) => {
  const homestay = await hostService.pauseListing(req.user.id, req.params.id);
  sendSuccess(res, { data: { homestay }, message: "Listing paused" });
});

// PATCH /api/host/homestays/:id/resume
export const resume = asyncHandler(async (req, res) => {
  const homestay = await hostService.resumeListing(req.user.id, req.params.id);
  sendSuccess(res, { data: { homestay }, message: "Listing is live again" });
});
