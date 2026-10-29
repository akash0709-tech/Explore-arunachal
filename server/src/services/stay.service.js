// Public homestay pages for travellers. Only LIVE (approved) listings are shown.
//
// Privacy: every query uses an explicit list of public fields. Verification documents
// and the exact address landmark are never selected, so they can never leak.
import crypto from "node:crypto";
import { Homestay, Report, StayEvent } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { getTransformedUrl } from "./imagekit.service.js";
import { resolveDestinationId } from "./destination.service.js";

const CARD_FIELDS =
  "name hostId town pricePerNight peakPrice mealsIncluded rooms maxGuests facilities photos approxLocation approvedAt isSample";
const DETAIL_FIELDS =
  "name phone whatsapp description town approxLocation rooms maxGuests roomTypes facilities otherFacilities " +
  "pricePerNight peakPrice mealsIncluded openMonths checkIn checkOut photos approval.type approval.authority " +
  "approval.validUntil approvedAt hostId isSample";

const sortedPhotos = (photos = []) => [...photos].sort((a, b) => a.order - b.order);

// GeoJSON [lng, lat] -> { lat, lng } for the map
const toLatLng = (point) =>
  point?.coordinates ? { lat: point.coordinates[1], lng: point.coordinates[0] } : null;

// Today's date in India, e.g. "2026-10-29" (used for "once per day" counting)
const todayInIndia = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

// Who is looking: the user id, or for guests a one-way hash of their IP (we never store raw IPs)
const viewerKeyFor = (req) =>
  req.user
    ? `user:${req.user.id}`
    : `ip:${crypto
        .createHash("sha256")
        .update(req.ip ?? "")
        .digest("hex")
        .slice(0, 32)}`;

// GET /api/stays
export async function listStays({ town, maxPrice, minRooms, facilities, page, limit }) {
  const filter = { status: "live" };
  if (town) filter.town = await resolveDestinationId(town);
  if (maxPrice) filter.pricePerNight = { $lte: maxPrice };
  if (minRooms) filter.rooms = { $gte: minRooms };
  if (facilities.length > 0) {
    // Case-insensitive "has every one of these facilities"
    filter.facilities = { $all: facilities.map((f) => new RegExp(escapeRegex(f), "i")) };
  }

  const pagination = getPagination({ page, limit }, { defaultLimit: 12, maxLimit: 50 });
  const [items, total] = await Promise.all([
    Homestay.find(filter)
      .select(CARD_FIELDS)
      .populate("town", "name slug")
      .populate("hostId", "name")
      .sort({ approvedAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Homestay.countDocuments(filter)
  ]);

  const cards = items.map(({ photos, approxLocation, hostId, ...stay }) => {
    const cover = sortedPhotos(photos)[0];
    return {
      ...stay,
      hostName: hostId?.name?.split(/\s+/)[0] ?? "",
      location: toLatLng(approxLocation),
      thumbnailUrl: cover ? getTransformedUrl(cover.url) : null,
      photoCount: photos?.length ?? 0,
      verified: true // live = reviewed and approved by the tourism review team
    };
  });
  return { items: cards, pagination: buildPaginationMeta({ ...pagination, total }) };
}

async function findLiveStay(id, fields = "_id hostId") {
  const stay = await Homestay.findOne({ _id: id, status: "live" }).select(fields).lean();
  if (!stay) throw ApiError.notFound("This homestay is not available");
  return stay;
}

// Records a view or contact tap once per viewer per day. Returns true if it was new.
async function recordEventOnce(stay, req, type, channel = "none") {
  if (req.user && String(req.user.id) === String(stay.hostId)) return false; // hosts viewing their own listing
  try {
    await StayEvent.create({
      homestayId: stay._id,
      hostId: stay.hostId,
      type,
      channel,
      viewerKey: viewerKeyFor(req),
      day: todayInIndia()
    });
    return true;
  } catch (err) {
    if (err?.code === 11000) return false; // already counted today
    throw err;
  }
}

// GET /api/stays/:id
export async function getStay(id, req) {
  const stay = await Homestay.findOne({ _id: id, status: "live" })
    .select(DETAIL_FIELDS)
    .populate("town", "name slug altitudeM district")
    .populate("hostId", "name")
    .lean();
  if (!stay) throw ApiError.notFound("This homestay is not available");

  if (await recordEventOnce(stay, req, "view")) {
    await Homestay.updateOne({ _id: stay._id }, { $inc: { "stats.views": 1 } });
  }

  const { photos, approxLocation, hostId, ...details } = stay;
  return {
    ...details,
    hostName: hostId?.name?.split(/\s+/)[0] ?? "",
    location: toLatLng(approxLocation), // approximate pin only; the exact address is shared by the host
    photos: sortedPhotos(photos).map(({ url, label }) => ({
      url,
      label,
      thumbnailUrl: getTransformedUrl(url)
    })),
    verified: true
  };
}

// POST /api/stays/:id/contact-tap
export async function recordContactTap(id, channel, req) {
  const stay = await findLiveStay(id);
  const counted = await recordEventOnce(stay, req, "contact_tap", channel);
  if (counted) await Homestay.updateOne({ _id: stay._id }, { $inc: { "stats.contactTaps": 1 } });
  return { counted };
}

// POST /api/stays/:id/report
export async function reportStay(id, user, { reason, note }) {
  const stay = await findLiveStay(id);
  if (String(stay.hostId) === String(user.id))
    throw ApiError.badRequest("You cannot report your own listing");

  const alreadyOpen = await Report.exists({ homestayId: stay._id, reporterId: user.id, status: "open" });
  if (alreadyOpen)
    throw ApiError.conflict("You already reported this homestay. Our team is looking into it.");

  const report = await Report.create({ homestayId: stay._id, reporterId: user.id, reason, note });
  return { id: report._id, status: report.status };
}
