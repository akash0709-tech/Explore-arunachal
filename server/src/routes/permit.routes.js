// Routes mounted at /api/permits (public). Admin edits come in a later task.
import { Router } from "express";
import * as permitController from "../controllers/permit.controller.js";
import { validate } from "../middleware/validate.js";
import { checkPermitsQuery } from "../validators/permit.validator.js";

const router = Router();

router.get("/check", validate({ query: checkPermitsQuery }), permitController.check);

export default router;
