// Trips: preview a plan, save it, and manage saved trips.
// The plan is ALWAYS calculated here on the server (planner.service.js); a plan sent
// by the browser is never trusted or stored.
import { Trip, Route, Destination, Homestay } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { buildPlan, HIGH_ALTITUDE_M } from "./planner.service.js";
import { checkPermits } from "./permit.service.js";
import { getForecastForDestination } from "./weather.service.js";
import { logger } from "../utils/logger.js";

const PLAN_INPUT_KEYS = [
  "citizen",
  "startId",
  "destinationIds",
  "days",
  "travellers",
  "month",
  "budgetPerPerson",
  "transportMode",
  "interests"
];
const MAX_SAVED_HOSTS = 20;
const SAVED_HOST_FIELDS =
  "name hostId town phone whatsapp status pricePerNight isSample photos.url photos.label";

// ----- Planning -----

// The whole road network is small, so we load it for every plan
async function loadNetwork() {
  const [routes, places] = await Promise.all([
    Route.find().lean(),
    Destination.find()
      .select("name slug altitudeM isWaypoint isPass isStartCity attractions extraPermitNote")
      .lean()
  ]);
  return { routes, places };
}

// Friendly checks the planner itself does not do
function checkStops(places, { startId, destinationIds }) {
  const byId = new Map(places.map((p) => [String(p._id), p]));
  const start = byId.get(String(startId));
  if (!start) throw ApiError.badRequest("Start city not found");
  if (!start.isStartCity) throw ApiError.badRequest(`${start.name} is not a start city`);

  for (const id of destinationIds) {
    const place = byId.get(String(id));
    if (!place) throw ApiError.badRequest(`Destination not found: ${id}`);
    if (place.isWaypoint) throw ApiError.badRequest(`${place.name} is a stop on the way, not a destination`);
  }
}

// Only the main permit is copied into the trip (for offline use); extra rules appear in warnings
function toPermitSnapshot(mainPermit) {
  if (!mainPermit) return null;
  const { code, title, documents, steps, officialUrl, lastVerifiedAt } = mainPermit;
  return { code, title, documents, steps, officialUrl, lastVerifiedAt };
}

// Plan + permits for a set of choices. Used by preview, create and update.
async function computeTrip(input) {
  const { routes, places } = await loadNetwork();
  checkStops(places, input);

  const plan = buildPlan({ routes, places, ...input });

  const slugs = [places.find((p) => String(p._id) === String(input.startId)).slug].concat(
    plan.orderedDestinations.map((d) => d.slug)
  );
  const permits = await checkPermits({ citizen: input.citizen, destinations: slugs });

  return {
    plan,
    permitSnapshot: toPermitSnapshot(permits.mainPermit),
    extraPermits: permits.extraRules.map(({ title, whoNeedsIt, forDestinations }) => ({
      title,
      whoNeedsIt,
      forDestinations
    })),
    disclaimer: permits.disclaimer
  };
}

// Packing / to-do list generated from the plan and permits
function buildChecklist({ plan, permitSnapshot, extraPermits }) {
  const items = [];
  if (permitSnapshot?.code === "ILP") {
    items.push("Apply for your ILP on the official e-ILP portal", "Download and print your e-ILP");
  }
  if (permitSnapshot?.code === "PAP") {
    items.push(
      "Confirm PAP rules and apply through the official channel",
      "Carry printed copies of your PAP"
    );
  }
  items.push("Carry your original photo ID and two copies");
  for (const extra of extraPermits) items.push(`Arrange after arrival: ${extra.title}`);
  if (plan.days.some((d) => d.stayAltitudeM > HIGH_ALTITUDE_M)) {
    items.push("Pack warm layers for nights above 2,800 m");
  }
  items.push("Carry enough cash: card and UPI need network, which drops on hill roads");
  items.push("Save this trip for offline use before you leave");
  return items;
}

const defaultTitle = (plan) =>
  `${plan.orderedDestinations.map((d) => d.name).join(" & ")} · ${plan.days.length} days`;

// Copy a computed plan onto a Trip document (new or existing)
function applyComputed(trip, input, computed) {
  const { plan, permitSnapshot } = computed;
  for (const keyName of PLAN_INPUT_KEYS) trip[keyName] = input[keyName];
  trip.destinationIds = plan.orderedDestinations.map((d) => d.id); // stored in visiting order
  trip.plan = {
    days: plan.days,
    warnings: plan.warnings,
    totalKm: plan.totalKm,
    minimumDays: plan.minimumDays
  };
  const { transport, stay, food, total, tier, budgetDifference } = plan.cost;
  trip.cost = { transport, stay, food, total, tier, budgetDifference: budgetDifference ?? undefined };
  trip.permitSnapshot = permitSnapshot ?? undefined;

  // Keep the ticks on checklist items that still exist after a re-plan
  const previous = new Map((trip.checklist ?? []).map((c) => [c.item, c]));
  trip.checklist = buildChecklist(computed).map((item) => previous.get(item) ?? { item, done: false });
}

// ----- Ownership -----

// Exported because other services (e.g. maps) also need "only the owner" access
export async function findOwnedTrip(userId, tripId) {
  const trip = await Trip.findById(tripId);
  if (!trip) throw ApiError.notFound("Trip not found");
  if (String(trip.userId) !== String(userId)) throw ApiError.forbidden("This trip belongs to another user");
  return trip;
}

const populateTrip = (trip) =>
  trip.populate([
    { path: "startId", select: "name slug" },
    { path: "destinationIds", select: "name slug altitudeM location" },
    {
      path: "savedHostIds",
      select: SAVED_HOST_FIELDS,
      populate: [
        { path: "town", select: "name slug" },
        { path: "hostId", select: "name" }
      ]
    }
  ]);

// ----- Public functions used by the controller -----

// Preview also shows the next 7 days of weather at the farthest destination.
// Weather is optional: if it fails, the plan still comes back with weather: null.
export async function previewTrip(input) {
  const computed = await computeTrip(input);
  const farthest = computed.plan.orderedDestinations.at(-1); // sorted nearest first

  let weather = null;
  try {
    weather = await getForecastForDestination(farthest.slug, 7);
  } catch (err) {
    logger.warn(`Plan preview without weather: ${err.message}`);
  }
  return { ...computed, weather };
}

export async function createTrip(userId, input) {
  const computed = await computeTrip(input);
  const trip = new Trip({ userId, title: input.title || defaultTitle(computed.plan) });
  applyComputed(trip, input, computed);
  await trip.save();
  return populateTrip(trip);
}

export async function listTrips(userId, query) {
  const { page, limit, skip } = getPagination(query);
  const filter = { userId };
  const [items, total] = await Promise.all([
    Trip.find(filter)
      .select(
        "title citizen startId destinationIds days travellers month cost.total cost.tier plan.totalKm createdAt updatedAt"
      )
      .populate("startId", "name slug")
      .populate("destinationIds", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Trip.countDocuments(filter)
  ]);
  return { items, pagination: buildPaginationMeta({ page, limit, total }) };
}

export async function getTrip(userId, tripId) {
  const trip = await findOwnedTrip(userId, tripId);
  return populateTrip(trip);
}

export async function updateTrip(userId, tripId, changes) {
  const trip = await findOwnedTrip(userId, tripId);
  const { title, checklist, addHostId, removeHostId, ...planChanges } = changes;

  // 1. New planning choices: merge with the saved ones and re-plan on the server
  if (Object.keys(planChanges).length > 0) {
    const current = {
      citizen: trip.citizen,
      startId: String(trip.startId),
      destinationIds: trip.destinationIds.map(String),
      days: trip.days,
      travellers: trip.travellers,
      month: trip.month,
      budgetPerPerson: trip.budgetPerPerson,
      transportMode: trip.transportMode,
      interests: trip.interests
    };
    const input = { ...current, ...planChanges };
    if (input.budgetPerPerson === null) input.budgetPerPerson = undefined;
    applyComputed(trip, input, await computeTrip(input));
  }

  if (title !== undefined) trip.title = title;

  // 2. Tick / untick checklist items
  for (const { id, done } of checklist ?? []) {
    const item = trip.checklist.id(id);
    if (!item) throw ApiError.badRequest(`Checklist item not found: ${id}`);
    item.done = done;
  }

  // 3. Saved homestays: only live (approved) ones can be added
  if (addHostId) {
    const isLive = await Homestay.exists({ _id: addHostId, status: "live" });
    if (!isLive) throw ApiError.badRequest("Only live homestays can be saved to a trip");
    if (!trip.savedHostIds.some((id) => String(id) === addHostId)) {
      if (trip.savedHostIds.length >= MAX_SAVED_HOSTS) {
        throw ApiError.badRequest(`You can save up to ${MAX_SAVED_HOSTS} homestays per trip`);
      }
      trip.savedHostIds.push(addHostId);
    }
  }
  if (removeHostId) trip.savedHostIds.pull(removeHostId);

  await trip.save();
  return populateTrip(trip);
}

export async function deleteTrip(userId, tripId) {
  const trip = await findOwnedTrip(userId, tripId);
  await trip.deleteOne();
}
