// Road geometry and place search through OpenRouteService (ORS), cached in MongoDB.
//
// - The ORS key stays on the server: the browser only ever calls our API.
// - Geometry is only for DRAWING the route. Planning uses our own hill-adjusted hours.
// - If ORS fails (no key, quota, network), we still return a straight line between
//   the two places with approximate: true, so the map always shows something.
import axios from "axios";
import { Destination, Route, RouteCache } from "../models/index.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";
import { buildGraph, shortestPath } from "./planner.service.js";
import { findOwnedTrip } from "./trip.service.js";

const ORS_BASE = "https://api.openrouteservice.org";
const ORS_TIMEOUT_MS = 10_000;
const ARUNACHAL_CENTRE = { lat: 27.1, lng: 93.6 }; // geocoding prefers results near here

const orsHeaders = () => ({ Authorization: env.orsApiKey, "Content-Type": "application/json" });

// Straight-line distance between two [lng, lat] points (haversine formula), in km
function straightLineKm([lng1, lat1], [lng2, lat2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

const round1 = (n) => Math.round(n * 10) / 10;

async function loadPlaces(ids) {
  const places = await Destination.find({ _id: { $in: ids } })
    .select("name slug altitudeM location isWaypoint isPass isStartCity")
    .lean();
  const byId = new Map(places.map((p) => [String(p._id), p]));
  for (const id of ids) {
    if (!byId.has(String(id))) throw ApiError.notFound(`Place not found: ${id}`);
  }
  return byId;
}

async function fetchOrsDirections(fromCoords, toCoords) {
  const { data } = await axios.post(
    `${ORS_BASE}/v2/directions/driving-car/geojson`,
    { coordinates: [fromCoords, toCoords] },
    { headers: orsHeaders(), timeout: ORS_TIMEOUT_MS }
  );
  const feature = data.features[0];
  return {
    geometry: feature.geometry, // { type: "LineString", coordinates: [[lng, lat], ...] }
    distanceKm: round1(feature.properties.summary.distance / 1000)
  };
}

// Geometry for one pair of places. The same cache entry serves both directions.
async function legGeometry(from, to) {
  const forwardKey = `${from._id}-${to._id}`;
  const reverseKey = `${to._id}-${from._id}`;

  const cached = await RouteCache.findOne({ key: { $in: [forwardKey, reverseKey] } }).lean();
  if (cached) {
    logger.info(`route cache hit ${from.name} -> ${to.name}`);
    const coordinates =
      cached.key === forwardKey ? cached.geometry.coordinates : [...cached.geometry.coordinates].reverse();
    return {
      geometry: { type: "LineString", coordinates },
      distanceKm: cached.distanceKm,
      approximate: false
    };
  }

  try {
    const { geometry, distanceKm } = await fetchOrsDirections(
      from.location.coordinates,
      to.location.coordinates
    );
    await RouteCache.updateOne(
      { key: forwardKey },
      { geometry, distanceKm, fetchedAt: new Date() },
      { upsert: true }
    );
    return { geometry, distanceKm, approximate: false };
  } catch (err) {
    // Never log the key; the status code is enough to understand the problem
    logger.warn(`ORS directions failed (${from.name} -> ${to.name}): ${err.response?.status ?? err.message}`);
    return {
      geometry: { type: "LineString", coordinates: [from.location.coordinates, to.location.coordinates] },
      distanceKm: round1(straightLineKm(from.location.coordinates, to.location.coordinates)),
      approximate: true // not cached, so we try ORS again next time
    };
  }
}

const placeSummary = (p) => ({ id: p._id, name: p.name, slug: p.slug });

// GET /api/maps/route?from=&to=
export async function getRouteGeometry(fromId, toId) {
  const byId = await loadPlaces([fromId, toId]);
  const from = byId.get(String(fromId));
  const to = byId.get(String(toId));
  const leg = await legGeometry(from, to);
  return { from: placeSummary(from), to: placeSummary(to), ...leg };
}

// Marker type for the map legend
function markerType(place, stopIds) {
  if (String(place._id) === String(stopIds[0])) return "start";
  if (stopIds.some((id) => String(id) === String(place._id))) return "destination";
  return place.isPass ? "pass" : "waypoint";
}

// Whole itinerary: follows OUR road network (e.g. via Bhalukpong and Sela Pass), one leg
// per road segment, so each segment is fetched and cached once and reused by every trip.
export async function getPlanGeometry(orderedStopIds) {
  const routes = await Route.find().select("fromId toId hillHours roadKm isPass").lean();
  const graph = buildGraph(routes);

  // 1. Expand stops into the full list of places we drive through
  const placeIds = [String(orderedStopIds[0])];
  for (let i = 0; i < orderedStopIds.length - 1; i++) {
    const path = shortestPath(graph, orderedStopIds[i], orderedStopIds[i + 1]);
    if (!path) throw ApiError.badRequest("No road route connects these places");
    placeIds.push(...path.legs.map((leg) => String(leg.toId)));
  }
  const byId = await loadPlaces([...new Set(placeIds)]);

  // 2. Geometry for every consecutive pair, fetched in parallel
  const pairs = placeIds.slice(0, -1).map((id, i) => [byId.get(id), byId.get(placeIds[i + 1])]);
  const legs = await Promise.all(pairs.map(([from, to]) => legGeometry(from, to)));

  // 3. Join the legs into one line (skip each leg's first point: it repeats the previous end)
  const coordinates = legs.flatMap((leg, i) =>
    i === 0 ? leg.geometry.coordinates : leg.geometry.coordinates.slice(1)
  );

  // 4. One marker per place (start, destinations, waypoints and passes), each once
  const markers = [...new Set(placeIds)].map((id) => {
    const place = byId.get(id);
    const [lng, lat] = place.location.coordinates;
    return {
      id,
      name: place.name,
      lat,
      lng,
      altitudeM: place.altitudeM,
      type: markerType(place, orderedStopIds)
    };
  });

  return {
    geometry: { type: "LineString", coordinates },
    distanceKm: round1(legs.reduce((total, leg) => total + leg.distanceKm, 0)),
    approximate: legs.some((leg) => leg.approximate),
    markers,
    legs: pairs.map(([from, to], i) => ({
      from: from.name,
      to: to.name,
      distanceKm: legs[i].distanceKm,
      approximate: legs[i].approximate
    }))
  };
}

// GET /api/maps/geocode?q=  (hosts searching for their town)
export async function geocode(query) {
  try {
    const { data } = await axios.get(`${ORS_BASE}/geocode/search`, {
      headers: { Authorization: env.orsApiKey },
      timeout: ORS_TIMEOUT_MS,
      params: {
        text: query,
        "boundary.country": "IN",
        "focus.point.lat": ARUNACHAL_CENTRE.lat,
        "focus.point.lon": ARUNACHAL_CENTRE.lng,
        size: 5
      }
    });
    return data.features.map((f) => ({
      label: f.properties.label,
      name: f.properties.name,
      region: f.properties.region,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0]
    }));
  } catch (err) {
    logger.warn(`ORS geocoding failed: ${err.response?.status ?? err.message}`);
    throw new ApiError(
      503,
      "Place search is unavailable right now. You can drop the pin on the map instead."
    );
  }
}

// GET /api/maps/trip/:tripId (owner only): start -> destinations in order -> back to start
export async function getTripGeometry(userId, tripId) {
  const trip = await findOwnedTrip(userId, tripId);
  const stops = [trip.startId, ...trip.destinationIds, trip.startId].map(String);
  return getPlanGeometry(stops);
}
