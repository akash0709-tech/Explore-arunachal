// Host side: the 6-step registration wizard and the host dashboard.
// Drafts live in MongoDB and are saved after every step, so a host can close the
// browser and continue later from currentStep.
import mongoose from "mongoose";
import { Homestay, Destination, StayEvent } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { HOMESTAY_EDITABLE_STATUS, HOMESTAY_WIZARD_STEPS, MAX_DRAFTS_PER_HOST } from "../utils/constants.js";
import { missingForStep, missingForListing } from "./listingChecks.service.js";
import { recordAudit } from "./audit.service.js";
import { deleteFileQuietly, getTransformedUrl } from "./imagekit.service.js";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// ----- Loading with ownership checks -----

async function findOwnHomestay(hostId, homestayId, { withPrivate = false } = {}) {
  const query = Homestay.findById(homestayId);
  if (withPrivate) query.select("+addressLandmark +documents");
  const homestay = await query;
  if (!homestay) throw ApiError.notFound("Homestay not found");
  if (String(homestay.hostId) !== String(hostId))
    throw ApiError.forbidden("This homestay belongs to another host");
  return homestay;
}

function assertEditable(homestay) {
  if (!HOMESTAY_EDITABLE_STATUS.includes(homestay.status)) {
    throw ApiError.conflict(`This listing is ${homestay.status} and cannot be edited right now`);
  }
}

// What the OWNER sees: private fields included, but documents only as metadata (never fileIds or URLs)
function toHostView(homestay) {
  const data = homestay.toJSON();
  data.documents = (homestay.documents ?? []).map(({ slot, proofType, idType, fileName, uploadedAt }) => ({
    slot,
    proofType,
    idType,
    fileName,
    uploadedAt
  }));
  if (data.approxLocation?.coordinates) {
    const [lng, lat] = data.approxLocation.coordinates;
    data.approxLocation = { lat, lng };
  }
  data.missing = missingForListing(homestay); // what is left before submitting
  return data;
}

// ----- Wizard -----

export async function createDraft(hostId) {
  const drafts = await Homestay.countDocuments({ hostId, status: "draft" });
  if (drafts >= MAX_DRAFTS_PER_HOST) {
    throw ApiError.badRequest(`You already have ${drafts} drafts. Finish or delete one first.`);
  }
  const homestay = await Homestay.create({ hostId, status: "draft", currentStep: 1 });
  return { id: homestay._id, status: homestay.status, currentStep: homestay.currentStep };
}

export async function getOwnHomestay(hostId, homestayId) {
  const homestay = await findOwnHomestay(hostId, homestayId, { withPrivate: true });
  return toHostView(homestay);
}

// Turns a validated step body into the fields stored on the homestay
async function fieldsForStep(step, body, homestay) {
  switch (step) {
    case 1: {
      const town = await Destination.findOne({ _id: body.town, isWaypoint: false }).select("_id").lean();
      if (!town)
        throw ApiError.badRequest("Choose a town from the list", [
          { field: "town", message: "Unknown town" }
        ]);
      const { approxLocation, ...rest } = body;
      return {
        ...rest,
        approxLocation: { type: "Point", coordinates: [approxLocation.lng, approxLocation.lat] }
      };
    }
    case 3:
      return body;
    case 4:
      // Replace the whole approval block, so fields from the other choice do not linger
      return { approval: body };
    case 5: {
      // proofType / idType live on the uploaded document entries
      const documents = homestay.documents.map((doc) => {
        if (doc.slot === "proof") doc.proofType = body.proofType;
        if (doc.slot === "id") doc.idType = body.idType;
        return doc;
      });
      return { documents };
    }
    default:
      return {}; // steps 2 and 6 have no fields
  }
}

export async function saveStep(hostId, homestayId, step, body) {
  const homestay = await findOwnHomestay(hostId, homestayId, { withPrivate: true });
  assertEditable(homestay);

  // No skipping ahead: you can save the current step or go back to an earlier one
  if (step > homestay.currentStep) {
    throw ApiError.badRequest(`Finish step ${homestay.currentStep} first`);
  }

  homestay.set(await fieldsForStep(step, body, homestay));

  // Steps 2, 4 and 5 also depend on uploaded files, so check the step is really complete
  const stillMissing = missingForStep(homestay, step);
  if (stillMissing.length > 0) {
    throw ApiError.badRequest(
      "This step is not complete yet",
      stillMissing.map(({ field, message }) => ({ field, message }))
    );
  }

  homestay.currentStep = Math.min(HOMESTAY_WIZARD_STEPS, Math.max(homestay.currentStep, step + 1));
  await homestay.save();
  return toHostView(homestay);
}

export async function submitForReview(host, homestayId, declarations) {
  const homestay = await findOwnHomestay(host.id, homestayId, { withPrivate: true });
  if (!HOMESTAY_EDITABLE_STATUS.includes(homestay.status)) {
    throw ApiError.conflict(`A ${homestay.status} listing cannot be submitted`);
  }

  // Re-check every step on the server: never trust that the browser did it
  const stillMissing = missingForListing(homestay);
  if (stillMissing.length > 0) {
    throw ApiError.badRequest(
      `Please complete ${stillMissing.length} item(s) before submitting`,
      stillMissing.map(({ step, field, message }) => ({ field, message: `Step ${step}: ${message}` }))
    );
  }

  const previousStatus = homestay.status;
  homestay.set({
    declarations,
    status: "pending",
    submittedAt: new Date(),
    currentStep: HOMESTAY_WIZARD_STEPS
  });
  await homestay.save();

  await recordAudit({
    actor: host,
    action: "HOMESTAY_SUBMITTED",
    targetType: "Homestay",
    targetId: homestay._id,
    note:
      previousStatus === "changes_requested" ? "Resubmitted after requested changes" : "Submitted for review",
    meta: { fromStatus: previousStatus, toStatus: "pending" }
  });

  return toHostView(homestay);
}

export async function deleteDraft(hostId, homestayId) {
  const homestay = await findOwnHomestay(hostId, homestayId, { withPrivate: true });
  if (homestay.status !== "draft") throw ApiError.conflict("Only drafts can be deleted");

  await homestay.deleteOne();
  // Remove its files from ImageKit too (photos and private documents)
  const fileIds = [...homestay.photos.map((p) => p.fileId), ...homestay.documents.map((d) => d.fileId)];
  await Promise.all(fileIds.map(deleteFileQuietly));
}

// ----- Dashboard -----

// Where the host is on their journey: 1 account, 2 register, 3 documents, 4 review, 5 live
function pathStageFor(listings) {
  if (listings.some((h) => ["live", "paused"].includes(h.status))) return 5;
  if (listings.some((h) => h.status === "pending")) return 4;
  if (listings.some((h) => h.status === "changes_requested" || h.currentStep >= 4)) return 3;
  if (listings.length > 0) return 2;
  return 1;
}

export async function getDashboard(hostId) {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  const hostObjectId = new mongoose.Types.ObjectId(String(hostId));

  const [listings, eventCounts] = await Promise.all([
    Homestay.find({ hostId }).select("status currentStep").lean(),
    StayEvent.aggregate([
      { $match: { hostId: hostObjectId, createdAt: { $gte: since } } },
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ])
  ]);
  const countOf = (type) => eventCounts.find((e) => e._id === type)?.count ?? 0;

  return {
    listingsCount: listings.length,
    liveCount: listings.filter((h) => h.status === "live").length,
    views30d: countOf("view"),
    contactTaps30d: countOf("contact_tap"),
    pathStage: pathStageFor(listings)
  };
}

export async function listMyHomestays(hostId, query) {
  const { page, limit, skip } = getPagination(query);
  const filter = { hostId };
  const [items, total] = await Promise.all([
    Homestay.find(filter)
      .select(
        "name status currentStep reviewNote town photos pricePerNight submittedAt approvedAt stats updatedAt"
      )
      .populate("town", "name slug")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Homestay.countDocuments(filter)
  ]);

  const cards = items.map(({ photos, reviewNote, ...h }) => {
    const cover = [...(photos ?? [])].sort((a, b) => a.order - b.order)[0];
    return {
      ...h,
      photoCount: photos?.length ?? 0,
      thumbnailUrl: cover ? getTransformedUrl(cover.url) : null,
      // The admin's message matters only while the host has to act on it
      reviewNote: h.status === "changes_requested" ? reviewNote : undefined
    };
  });
  return { items: cards, pagination: buildPaginationMeta({ page, limit, total }) };
}

// live <-> paused only, as one atomic update so it can never jump from another status
async function switchStatus(hostId, homestayId, from, to) {
  await findOwnHomestay(hostId, homestayId);
  const updated = await Homestay.findOneAndUpdate(
    { _id: homestayId, hostId, status: from },
    { status: to },
    { returnDocument: "after" }
  ).select("name status");
  if (!updated)
    throw ApiError.conflict(`Only a ${from} listing can be ${to === "paused" ? "paused" : "resumed"}`);
  return updated;
}

export const pauseListing = (hostId, homestayId) => switchStatus(hostId, homestayId, "live", "paused");
export const resumeListing = (hostId, homestayId) => switchStatus(hostId, homestayId, "paused", "live");
