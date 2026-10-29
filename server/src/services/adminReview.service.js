// Admin: homestay review queue, decisions, suspensions and reminders.
// Every decision is written to the audit log and the host gets an email about it.
import { Homestay, Report, PermitRule, AuditLog } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { HOMESTAY_STATUS, DOCUMENT_SLOTS, PERMIT_STALE_DAYS } from "../utils/constants.js";
import { recordAudit } from "./audit.service.js";
import { checklistProblems, missingForListing, missingForStep } from "./listingChecks.service.js";
import { resolveDestinationId } from "./destination.service.js";
import { getTransformedUrl } from "./imagekit.service.js";
import { sendHostDecisionEmail, sendDocumentsReminderEmail } from "./mail.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysSince = (date) => (date ? Math.floor((Date.now() - new Date(date).getTime()) / DAY_MS) : null);

// Emails are helpful but not critical: a failed email never undoes a decision
async function notifyHost(to, homestayName, decision, note) {
  if (!to) return false;
  try {
    await sendHostDecisionEmail({ to, homestayName, decision, note });
    return true;
  } catch (err) {
    logger.warn(`Decision email to ${to} failed: ${err.message}`);
    return false;
  }
}

// ----- Dashboard -----

export async function getDashboard() {
  const [statusCounts, oldestPending, openReports, permits] = await Promise.all([
    Homestay.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Homestay.find({ status: "pending" })
      .sort({ submittedAt: 1 })
      .limit(5)
      .select("name ownerName town submittedAt")
      .populate("town", "name slug")
      .lean(),
    Report.countDocuments({ status: "open" }),
    PermitRule.find().select("code appliesTo title lastVerifiedAt").sort({ code: 1 }).lean()
  ]);

  return {
    counts: Object.fromEntries(
      HOMESTAY_STATUS.map((status) => [status, statusCounts.find((c) => c._id === status)?.count ?? 0])
    ),
    oldestPending: oldestPending.map((h) => ({ ...h, daysWaiting: daysSince(h.submittedAt) })),
    openReports,
    permits: permits.map((p) => {
      const days = daysSince(p.lastVerifiedAt);
      return { ...p, daysSinceVerified: days, stale: days === null || days > PERMIT_STALE_DAYS };
    })
  };
}

// ----- Approvals queue -----

export async function listQueue({ status, town, q, sort, page, limit }) {
  const filter = { status };
  if (town) filter.town = await resolveDestinationId(town);
  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: pattern }, { ownerName: pattern }, { phone: pattern }];
  }

  const direction = sort === "newest" ? -1 : 1;
  const pagination = getPagination({ page, limit }, { defaultLimit: 20, maxLimit: 50 });
  const [items, total] = await Promise.all([
    Homestay.find(filter)
      // "documents" is listed explicitly because it is hidden by default (select: false)
      .select("name ownerName phone town status currentStep submittedAt updatedAt photos documents hostId")
      .populate("town", "name slug")
      .populate("hostId", "name email")
      .sort({ submittedAt: direction, createdAt: direction })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Homestay.countDocuments(filter)
  ]);

  const rows = items.map(({ documents = [], photos = [], hostId, ...h }) => ({
    ...h,
    host: hostId,
    docsCount: documents.length, // 0-3: certificate, proof, id
    photoCount: photos.length,
    daysWaiting: daysSince(h.submittedAt)
  }));
  return { items: rows, pagination: buildPaginationMeta({ ...pagination, total }) };
}

// ----- Full review page -----

export async function getReview(id) {
  const homestay = await Homestay.findById(id)
    .select("+addressLandmark +documents")
    .populate("hostId", "name email phone emailVerified phoneVerified status createdAt")
    .populate("town", "name slug district altitudeM")
    .lean();
  if (!homestay) throw ApiError.notFound("Homestay not found");

  const [history, reports] = await Promise.all([
    AuditLog.find({ targetId: homestay._id })
      .sort({ createdAt: -1 })
      .populate("actorId", "name email")
      .lean(),
    Report.find({ homestayId: homestay._id }).sort({ createdAt: -1 }).populate("reporterId", "name").lean()
  ]);

  const { documents = [], hostId: host, photos = [], approxLocation, ...details } = homestay;

  // One entry per slot, uploaded or not. Admins open a file through the signed-URL endpoint.
  const documentSlots = DOCUMENT_SLOTS.map((slot) => {
    const doc = documents.find((d) => d.slot === slot);
    return {
      slot,
      uploaded: Boolean(doc),
      fileName: doc?.fileName,
      proofType: doc?.proofType,
      idType: doc?.idType,
      uploadedAt: doc?.uploadedAt,
      viewEndpoint: doc ? `/api/uploads/admin/homestays/${id}/documents/${slot}/view` : null
    };
  });

  return {
    homestay: {
      ...details,
      location: approxLocation?.coordinates
        ? { lat: approxLocation.coordinates[1], lng: approxLocation.coordinates[0] }
        : null,
      photos: [...photos]
        .sort((a, b) => a.order - b.order)
        .map((p) => ({ ...p, thumbnailUrl: getTransformedUrl(p.url) })),
      daysWaiting: daysSince(homestay.submittedAt)
    },
    host,
    documentSlots,
    missing: missingForListing(homestay),
    history,
    reports
  };
}

// ----- Status changes (one shared, atomic helper) -----

async function changeStatus(admin, id, { from, to, set = {}, unset = {}, action, note, email, meta = {} }) {
  const before = await Homestay.findById(id).select("name status hostId").populate("hostId", "email");
  if (!before) throw ApiError.notFound("Homestay not found");
  if (!from.includes(before.status)) {
    throw ApiError.conflict(
      `This listing is ${before.status}; this action needs it to be ${from.join(" or ")}`
    );
  }

  const update = { $set: { status: to, ...set } };
  if (Object.keys(unset).length > 0) update.$unset = unset;

  // The status filter makes this safe if two admins act at the same moment
  const updated = await Homestay.findOneAndUpdate({ _id: id, status: { $in: from } }, update, {
    returnDocument: "after"
  }).select("name status reviewNote approvedAt");
  if (!updated) throw ApiError.conflict("Another admin changed this listing just now. Please refresh.");

  await recordAudit({
    actor: admin,
    action,
    targetType: "Homestay",
    targetId: updated._id,
    note,
    meta: { fromStatus: before.status, toStatus: to, ...meta }
  });

  const emailSent = await notifyHost(before.hostId?.email, before.name, email, note);
  return { homestay: updated, emailSent };
}

// POST /homestays/:id/decision
export async function decide(admin, id, { decision, note, checklist }) {
  if (decision === "approve") {
    const homestay = await Homestay.findById(id).select("+documents").populate("hostId", "status");
    if (!homestay) throw ApiError.notFound("Homestay not found");
    if (homestay.status !== "pending")
      throw ApiError.conflict(`Only pending listings can be approved (this one is ${homestay.status})`);

    // The server re-checks the checklist: the browser cannot approve with an "invalid" item
    const problems = checklistProblems(homestay, checklist);
    if (problems.length > 0) throw ApiError.badRequest("This listing cannot be approved yet", problems);
    if (homestay.hostId?.status === "suspended") throw ApiError.conflict("The host's account is suspended");

    return changeStatus(admin, id, {
      from: ["pending"],
      to: "live",
      set: { approvedAt: new Date() },
      unset: { reviewNote: 1 },
      action: "HOMESTAY_APPROVED",
      note,
      email: "approve",
      meta: { checklist }
    });
  }

  if (decision === "request_changes") {
    return changeStatus(admin, id, {
      from: ["pending"],
      to: "changes_requested",
      set: { reviewNote: note },
      action: "HOMESTAY_CHANGES_REQUESTED",
      note,
      email: "request_changes",
      meta: { checklist }
    });
  }

  return changeStatus(admin, id, {
    from: ["pending"],
    to: "rejected",
    set: { reviewNote: note },
    action: "HOMESTAY_REJECTED",
    note,
    email: "reject",
    meta: { checklist }
  });
}

export const suspendListing = (admin, id, note) =>
  changeStatus(admin, id, {
    from: ["live", "paused"],
    to: "suspended",
    set: { reviewNote: note },
    action: "HOMESTAY_SUSPENDED",
    note,
    email: "suspend"
  });

export const reinstateListing = (admin, id, note) =>
  changeStatus(admin, id, {
    from: ["suspended"],
    to: "live",
    unset: { reviewNote: 1 },
    action: "HOMESTAY_REINSTATED",
    note,
    email: "reinstate"
  });

// Sends the listing back to the host to re-check details and documents (it is hidden meanwhile)
export const requestReverification = (admin, id, note) =>
  changeStatus(admin, id, {
    from: ["live", "paused", "suspended"],
    to: "changes_requested",
    set: { reviewNote: `Re-verification needed: ${note}` },
    action: "HOMESTAY_REVERIFICATION_REQUESTED",
    note,
    email: "reverify"
  });

// ----- Reminders -----

const DOCUMENT_FIELDS = ["documents.certificate", "documents.proof", "documents.id", "proofType", "idType"];

// POST /homestays/bulk-remind: email hosts whose drafts are missing documents
export async function bulkRemind(ids) {
  const homestays = await Homestay.find({ _id: { $in: ids } })
    .select("name status approval documents hostId")
    .populate("hostId", "email")
    .lean();

  const reminded = [];
  const skipped = [];
  for (const id of ids) {
    const h = homestays.find((doc) => String(doc._id) === id);
    if (!h) {
      skipped.push({ id, reason: "not found" });
      continue;
    }
    if (!["draft", "changes_requested"].includes(h.status)) {
      skipped.push({ id, reason: `listing is ${h.status}` });
      continue;
    }
    const missingDocs = [...missingForStep(h, 4), ...missingForStep(h, 5)].filter((m) =>
      DOCUMENT_FIELDS.includes(m.field)
    );
    if (missingDocs.length === 0) {
      skipped.push({ id, reason: "documents are complete" });
      continue;
    }
    try {
      await sendDocumentsReminderEmail({
        to: h.hostId.email,
        homestayName: h.name,
        missingItems: missingDocs.map((m) => m.message)
      });
      reminded.push({ id, name: h.name ?? "(unnamed draft)", missing: missingDocs.map((m) => m.message) });
    } catch (err) {
      skipped.push({ id, reason: `email failed: ${err.message}` });
    }
  }
  return { reminded, skipped };
}

// ----- Hosts -----

// GET /hosts?status=live|paused|suspended: listings with their host's contact details
export async function listHosts({ status, page, limit }) {
  const pagination = getPagination({ page, limit }, { defaultLimit: 20, maxLimit: 50 });
  const filter = { status };
  const [items, total] = await Promise.all([
    Homestay.find(filter)
      .select("name town status pricePerNight approvedAt reviewNote stats hostId updatedAt")
      .populate("hostId", "name email phone emailVerified phoneVerified status")
      .populate("town", "name slug")
      .sort({ updatedAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Homestay.countDocuments(filter)
  ]);
  const rows = items.map(({ hostId, ...h }) => ({ ...h, host: hostId }));
  return { items: rows, pagination: buildPaginationMeta({ ...pagination, total }) };
}
