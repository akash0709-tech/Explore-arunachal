// Central router: every resource gets its own file and is mounted here under /api.
import { Router } from "express";

import authRoutes from "./auth.routes.js";
import destinationRoutes from "./destination.routes.js";
import permitRoutes from "./permit.routes.js";
import routeRoutes from "./route.routes.js";
import tripRoutes from "./trip.routes.js";
import weatherRoutes from "./weather.routes.js";
import mapRoutes from "./map.routes.js";
import stayRoutes from "./stay.routes.js";
import hostRoutes from "./host.routes.js";
import adminRoutes from "./admin.routes.js";
import uploadRoutes from "./upload.routes.js";
import reportRoutes from "./report.routes.js";

const router = Router();

router.use("/auth", authRoutes); //            login, register, OTP, refresh, logout
router.use("/destinations", destinationRoutes); // places such as Tawang, Ziro, Mechuka
router.use("/permits", permitRoutes); //       Permit Wizard rules (ILP, PAP, local permits)
router.use("/routes", routeRoutes); //         hill-adjusted drive hours between places
router.use("/trips", tripRoutes); //           Smart Itinerary and saved trips
router.use("/weather", weatherRoutes); //      Open-Meteo forecasts (cached)
router.use("/maps", mapRoutes); //             OpenRouteService geometry and geocoding (cached)
router.use("/stays", stayRoutes); //           public list of verified homestays
router.use("/host", hostRoutes); //            host dashboard and registration wizard
router.use("/admin", adminRoutes); //          review queue, hosts, reports, permit rules
router.use("/uploads", uploadRoutes); //       photos and private documents to ImageKit
router.use("/reports", reportRoutes); //       traveller reports about a listing

export default router;
