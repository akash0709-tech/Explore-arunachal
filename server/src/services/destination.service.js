// Read-only queries for destinations (list, search, detail with nearby places).
import { Destination } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { PUBLIC_PERMIT_FIELDS } from "./permit.service.js";

const LIST_FIELDS =
  "name slug district altitudeM location bestMonths coverImage isStartCity isWaypoint isSample";
const NEARBY_RADIUS_METERS = 150_000; // straight-line search radius for "nearby"
const NEARBY_LIMIT = 4;

// Rules for who appears in the list:
//   ?isStartCity=true   -> only start cities (Guwahati, Itanagar), even if they are waypoints
//   default             -> places to visit; waypoints such as Sela Pass are hidden
//   ?includeWaypoints=true -> everything (used by the map)
export async function listDestinations({ q, isStartCity, includeWaypoints, page, limit }) {
  const filter = {};
  if (isStartCity !== undefined) filter.isStartCity = isStartCity;
  if (isStartCity !== true && !includeWaypoints) filter.isWaypoint = false;
  if (q) filter.name = { $regex: escapeRegex(q), $options: "i" };

  const pagination = getPagination({ page, limit }, { defaultLimit: 50, maxLimit: 100 });
  const [items, total] = await Promise.all([
    Destination.find(filter)
      .select(LIST_FIELDS)
      .sort({ name: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Destination.countDocuments(filter)
  ]);

  return { items, pagination: buildPaginationMeta({ ...pagination, total }) };
}

export async function getDestinationBySlug(slug) {
  const destination = await Destination.findOne({ slug })
    .select("-__v")
    .populate({ path: "permitRuleIds", select: PUBLIC_PERMIT_FIELDS })
    .lean();
  if (!destination) throw ApiError.notFound(`No destination found for "${slug}"`);

  // Closest other places to visit. $geoNear (the aggregation form of $near) also
  // returns the distance. It is a straight line, not road distance.
  const nearby = await Destination.aggregate([
    {
      $geoNear: {
        near: destination.location,
        distanceField: "distanceM",
        maxDistance: NEARBY_RADIUS_METERS,
        spherical: true,
        query: { _id: { $ne: destination._id }, isWaypoint: false }
      }
    },
    { $limit: NEARBY_LIMIT },
    {
      $project: {
        name: 1,
        slug: 1,
        district: 1,
        altitudeM: 1,
        location: 1,
        coverImage: 1,
        isSample: 1,
        straightLineKm: { $round: [{ $divide: ["$distanceM", 1000] }, 0] }
      }
    }
  ]);

  // Rename permitRuleIds -> permitRules, since they are full rule objects now
  const { permitRuleIds, ...details } = destination;
  return { ...details, permitRules: permitRuleIds, nearby };
}

// Accepts a destination slug ("tawang") or id and returns the id. Used by list filters.
export async function resolveDestinationId(slugOrId) {
  if (/^[a-f\d]{24}$/i.test(slugOrId)) return slugOrId;
  const destination = await Destination.findOne({ slug: slugOrId }).select("_id").lean();
  if (!destination) throw ApiError.notFound(`Unknown town "${slugOrId}"`);
  return destination._id;
}
