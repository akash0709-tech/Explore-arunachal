// Thin controllers for /api/admin. req.user is the admin (used as the audit "actor").
import * as reviewService from "../services/adminReview.service.js";
import * as reportService from "../services/adminReport.service.js";
import * as contentService from "../services/adminContent.service.js";
import { listAudit } from "../services/audit.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";

const DECISION_MESSAGES = {
  approve: "Approved: the homestay is now live",
  request_changes: "Changes requested from the host",
  reject: "Listing rejected"
};

// ----- Dashboard and review -----

export const dashboard = asyncHandler(async (_req, res) => {
  sendSuccess(res, { data: await reviewService.getDashboard() });
});

export const queue = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await reviewService.listQueue(req.query) });
});

export const review = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await reviewService.getReview(req.params.id) });
});

export const decide = asyncHandler(async (req, res) => {
  const data = await reviewService.decide(req.user, req.params.id, req.body);
  sendSuccess(res, { data, message: DECISION_MESSAGES[req.body.decision] });
});

export const bulkRemind = asyncHandler(async (req, res) => {
  const data = await reviewService.bulkRemind(req.body.ids);
  sendSuccess(res, { data, message: `${data.reminded.length} host(s) reminded` });
});

export const hosts = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await reviewService.listHosts(req.query) });
});

export const suspend = asyncHandler(async (req, res) => {
  const data = await reviewService.suspendListing(req.user, req.params.id, req.body.note);
  sendSuccess(res, { data, message: "Listing suspended" });
});

export const reinstate = asyncHandler(async (req, res) => {
  const data = await reviewService.reinstateListing(req.user, req.params.id, req.body.note);
  sendSuccess(res, { data, message: "Listing is live again" });
});

export const reverify = asyncHandler(async (req, res) => {
  const data = await reviewService.requestReverification(req.user, req.params.id, req.body.note);
  sendSuccess(res, { data, message: "Re-verification requested from the host" });
});

// ----- Reports -----

export const reports = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await reportService.listReports(req.query) });
});

export const resolveReport = asyncHandler(async (req, res) => {
  const data = await reportService.resolveReport(req.user, req.params.id, req.body);
  sendSuccess(res, { data, message: "Report resolved" });
});

// ----- Permit rules -----

export const permits = asyncHandler(async (_req, res) => {
  sendSuccess(res, { data: { items: await contentService.listPermits() } });
});

export const updatePermit = asyncHandler(async (req, res) => {
  const rule = await contentService.updatePermit(req.user, req.params.id, req.body);
  sendSuccess(res, { data: { rule }, message: "Permit rule updated (not yet marked verified)" });
});

export const verifyPermit = asyncHandler(async (req, res) => {
  const rule = await contentService.verifyPermit(req.user, req.params.id);
  sendSuccess(res, { data: { rule }, message: "Marked as verified today" });
});

// ----- Destinations and road segments -----

export const createDestination = asyncHandler(async (req, res) => {
  const destination = await contentService.createDestination(req.user, req.body);
  sendSuccess(res, { statusCode: 201, data: { destination }, message: "Destination added" });
});

export const updateDestination = asyncHandler(async (req, res) => {
  const destination = await contentService.updateDestination(req.user, req.params.id, req.body);
  sendSuccess(res, { data: { destination }, message: "Destination updated" });
});

export const createRoute = asyncHandler(async (req, res) => {
  const route = await contentService.createRoute(req.user, req.body);
  sendSuccess(res, { statusCode: 201, data: { route }, message: "Road segment added" });
});

export const updateRoute = asyncHandler(async (req, res) => {
  const route = await contentService.updateRoute(req.user, req.params.id, req.body);
  sendSuccess(res, { data: { route }, message: "Road segment updated" });
});

// ----- Audit log -----

export const audit = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await listAudit(req.query) });
});
