// Admin: reference data that travellers rely on (permit rules, destinations, road segments).
// Admins keep it up to date without code changes; every change goes to the audit log.
import { PermitRule, Destination, Route } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { PERMIT_STALE_DAYS } from "../utils/constants.js";
import { recordAudit } from "./audit.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const withStaleFlag = (rule) => {
  const days = rule.lastVerifiedAt ? Math.floor((Date.now() - new Date(rule.lastVerifiedAt)) / DAY_MS) : null;
  return { ...rule, daysSinceVerified: days, stale: days === null || days > PERMIT_STALE_DAYS };
};

// ----- Permit rules -----

export async function listPermits() {
  const rules = await PermitRule.find().populate("verifiedBy", "name").sort({ code: 1 }).lean();
  return rules.map(withStaleFlag);
}

// Editing a rule does NOT mark it verified: an admin confirms that separately with /verify
export async function updatePermit(admin, id, changes) {
  const rule = await PermitRule.findByIdAndUpdate(id, changes, {
    returnDocument: "after",
    runValidators: true
  }).lean();
  if (!rule) throw ApiError.notFound("Permit rule not found");
  await recordAudit({
    actor: admin,
    action: "PERMIT_UPDATED",
    targetType: "PermitRule",
    targetId: rule._id,
    meta: { fields: Object.keys(changes) }
  });
  return withStaleFlag(rule);
}

export async function verifyPermit(admin, id) {
  const rule = await PermitRule.findByIdAndUpdate(
    id,
    { lastVerifiedAt: new Date(), verifiedBy: admin.id },
    { returnDocument: "after" }
  ).lean();
  if (!rule) throw ApiError.notFound("Permit rule not found");
  await recordAudit({
    actor: admin,
    action: "PERMIT_VERIFIED",
    targetType: "PermitRule",
    targetId: rule._id,
    note: `Checked against ${rule.officialUrl ?? "official sources"}`
  });
  return withStaleFlag(rule);
}

// ----- Destinations -----

// "Mechuka Valley" -> "mechuka-valley"
const slugify = (name) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toPoint = ({ lat, lng }) => ({ type: "Point", coordinates: [lng, lat] });

export async function createDestination(admin, { inArunachal, location, slug, ...fields }) {
  const finalSlug = slug ?? slugify(fields.name);

  // Same linking rule as the seed: ILP/PAP for places in Arunachal, plus extra local rules for this slug
  const rules = await PermitRule.find({
    $or: [{ code: { $in: inArunachal ? ["ILP", "PAP"] : [] } }, { code: "EXTRA", areaScope: finalSlug }]
  })
    .select("_id")
    .lean();

  const destination = await Destination.create({
    ...fields,
    slug: finalSlug,
    location: toPoint(location),
    permitRuleIds: rules.map((r) => r._id),
    isSample: false
  });

  await recordAudit({
    actor: admin,
    action: "DESTINATION_CREATED",
    targetType: "Destination",
    targetId: destination._id,
    meta: { slug: finalSlug }
  });
  return destination;
}

export async function updateDestination(admin, id, { location, ...changes }) {
  const destination = await Destination.findById(id);
  if (!destination) throw ApiError.notFound("Destination not found");

  destination.set(changes);
  if (location) destination.location = toPoint(location);
  await destination.save();

  await recordAudit({
    actor: admin,
    action: "DESTINATION_UPDATED",
    targetType: "Destination",
    targetId: destination._id,
    meta: { fields: [...Object.keys(changes), ...(location ? ["location"] : [])] }
  });
  return destination;
}

// ----- Road segments -----

export async function createRoute(admin, { fromId, toId, ...fields }) {
  const places = await Destination.find({ _id: { $in: [fromId, toId] } })
    .select("name")
    .lean();
  const from = places.find((p) => String(p._id) === fromId);
  const to = places.find((p) => String(p._id) === toId);
  if (!from || !to) throw ApiError.badRequest("Both places must exist");

  // One segment per pair of places: the planner uses it in both directions
  const exists = await Route.exists({
    $or: [
      { fromId, toId },
      { fromId: toId, toId: fromId }
    ]
  });
  if (exists)
    throw ApiError.conflict(`A road between ${from.name} and ${to.name} already exists. Edit it instead.`);

  const route = await Route.create({
    ...fields,
    fromId,
    toId,
    from: from.name,
    to: to.name,
    isSample: false
  });
  await recordAudit({
    actor: admin,
    action: "ROUTE_CREATED",
    targetType: "Route",
    targetId: route._id,
    meta: { from: from.name, to: to.name, roadKm: route.roadKm, hillHours: route.hillHours }
  });
  return route;
}

export async function updateRoute(admin, id, { fares, ...changes }) {
  const route = await Route.findById(id);
  if (!route) throw ApiError.notFound("Road segment not found");

  const before = { roadKm: route.roadKm, hillHours: route.hillHours };
  route.set(changes);
  if (fares) route.fares = { ...route.fares?.toObject(), ...fares }; // change only the fares sent
  await route.save();

  await recordAudit({
    actor: admin,
    action: "ROUTE_UPDATED",
    targetType: "Route",
    targetId: route._id,
    meta: { fields: [...Object.keys(changes), ...(fares ? ["fares"] : [])], before }
  });
  return route;
}
