// Routes mounted at /api/routes (public, read-only)
import { Router } from "express";
import * as routeController from "../controllers/route.controller.js";

const router = Router();

router.get("/graph", routeController.graph);

export default router;
