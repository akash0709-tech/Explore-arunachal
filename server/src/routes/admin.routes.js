// Routes mounted at /api/admin. Admins (tourism review team) only.
import { Router } from "express";
import * as adminController from "../controllers/admin.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import {
  idParams,
  queueQuery,
  decisionBody,
  bulkRemindBody,
  requiredNoteBody,
  optionalNoteBody,
  hostsQuery,
  reportsQuery,
  resolveReportBody,
  permitUpdateBody,
  createDestinationBody,
  updateDestinationBody,
  createRouteBody,
  updateRouteBody,
  auditQuery
} from "../validators/admin.validator.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

const byId = validate({ params: idParams });

// Dashboard
router.get("/dashboard", adminController.dashboard);

// Homestay review. "bulk-remind" comes before "/:id" routes so it is not read as an id.
router.post("/homestays/bulk-remind", validate({ body: bulkRemindBody }), adminController.bulkRemind);
router.get("/homestays", validate({ query: queueQuery }), adminController.queue);
router.get("/homestays/:id", byId, adminController.review);
router.post(
  "/homestays/:id/decision",
  validate({ params: idParams, body: decisionBody }),
  adminController.decide
);
router.post(
  "/homestays/:id/suspend",
  validate({ params: idParams, body: requiredNoteBody }),
  adminController.suspend
);
router.post(
  "/homestays/:id/reinstate",
  validate({ params: idParams, body: optionalNoteBody }),
  adminController.reinstate
);
router.post(
  "/homestays/:id/reverify",
  validate({ params: idParams, body: requiredNoteBody }),
  adminController.reverify
);
router.get("/hosts", validate({ query: hostsQuery }), adminController.hosts);

// Traveller reports
router.get("/reports", validate({ query: reportsQuery }), adminController.reports);
router.post(
  "/reports/:id/resolve",
  validate({ params: idParams, body: resolveReportBody }),
  adminController.resolveReport
);

// Permit rules
router.get("/permits", adminController.permits);
router.patch(
  "/permits/:id",
  validate({ params: idParams, body: permitUpdateBody }),
  adminController.updatePermit
);
router.post("/permits/:id/verify", byId, adminController.verifyPermit);

// Destinations and road segments
router.post("/destinations", validate({ body: createDestinationBody }), adminController.createDestination);
router.patch(
  "/destinations/:id",
  validate({ params: idParams, body: updateDestinationBody }),
  adminController.updateDestination
);
router.post("/routes", validate({ body: createRouteBody }), adminController.createRoute);
router.patch(
  "/routes/:id",
  validate({ params: idParams, body: updateRouteBody }),
  adminController.updateRoute
);

// Audit log
router.get("/audit", validate({ query: auditQuery }), adminController.audit);

export default router;
