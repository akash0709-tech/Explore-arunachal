// Routes mounted at /api/host. Hosts only.
import { Router } from "express";
import * as hostController from "../controllers/host.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import {
  STEP_SCHEMAS,
  homestayIdParams,
  stepParams,
  submitBody,
  listMyHomestaysQuery
} from "../validators/host.validator.js";

const router = Router();
router.use(requireAuth, requireRole("host"));

// Each wizard step has its own schema: pick it from the (already validated) step number
const validateStepBody = (req, res, next) =>
  validate({ body: STEP_SCHEMAS[req.params.step] })(req, res, next);

// Dashboard
router.get("/dashboard", hostController.dashboard);
router.get("/homestays", validate({ query: listMyHomestaysQuery }), hostController.listMine);

// Registration wizard
router.post("/homestays", hostController.createDraft);
router.get("/homestays/:id", validate({ params: homestayIdParams }), hostController.getOne);
router.patch(
  "/homestays/:id/step/:step",
  validate({ params: stepParams }),
  validateStepBody,
  hostController.saveStep
);
router.post(
  "/homestays/:id/submit",
  validate({ params: homestayIdParams, body: submitBody }),
  hostController.submit
);
router.delete("/homestays/:id", validate({ params: homestayIdParams }), hostController.removeDraft);

// Pause / resume a live listing
router.patch("/homestays/:id/pause", validate({ params: homestayIdParams }), hostController.pause);
router.patch("/homestays/:id/resume", validate({ params: homestayIdParams }), hostController.resume);

export default router;
