// Routes mounted at /api/weather (public)
import { Router } from "express";
import * as weatherController from "../controllers/weather.controller.js";
import { validate } from "../middleware/validate.js";
import {
  forecastQuery,
  destinationForecastParams,
  destinationForecastQuery
} from "../validators/weather.validator.js";

const router = Router();

router.get("/", validate({ query: forecastQuery }), weatherController.forecast);
router.get(
  "/destination/:slug",
  validate({ params: destinationForecastParams, query: destinationForecastQuery }),
  weatherController.destinationForecast
);

export default router;
