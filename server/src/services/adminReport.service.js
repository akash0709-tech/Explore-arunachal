// Admin: traveller reports about listings.
import { Report, Homestay } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { recordAudit } from "./audit.service.js";
import { suspendListing } from "./adminReview.service.js";

// GET /reports?status=open
export async function listReports({ status, page, limit }) {
  const pagination = getPagination({ page, limit }, { defaultLimit: 20, maxLimit: 50 });
  const filter = { status };
  const [items, total] = await Promise.all([
    Report.find(filter)
      .populate({
        path: "homestayId",
        select: "name status town",
        populate: { path: "town", select: "name slug" }
      })
      .populate("reporterId", "name email")
      .populate("resolvedBy", "name")
      .sort({ createdAt: status === "open" ? 1 : -1 }) // open: oldest first, so nothing waits forever
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Report.countDocuments(filter)
  ]);
  const rows = items.map(({ homestayId, reporterId, ...r }) => ({
    ...r,
    homestay: homestayId,
    reporter: reporterId
  }));
  return { items: rows, pagination: buildPaginationMeta({ ...pagination, total }) };
}

// POST /reports/:id/resolve { action: dismiss | suspend_listing, note }
export async function resolveReport(admin, id, { action, note }) {
  const actionText =
    action === "dismiss" ? `Dismissed${note ? `: ${note}` : ""}` : `Listing suspended: ${note}`;

  // Claim the report atomically, so two admins cannot resolve it twice
  const report = await Report.findOneAndUpdate(
    { _id: id, status: "open" },
    { status: "resolved", resolvedBy: admin.id, resolvedAt: new Date(), action: actionText },
    { returnDocument: "after" }
  );
  if (!report) {
    const exists = await Report.exists({ _id: id });
    throw exists
      ? ApiError.conflict("This report is already resolved")
      : ApiError.notFound("Report not found");
  }

  // Suspend the listing if it is still visible to travellers
  let suspension = null;
  if (action === "suspend_listing") {
    const stay = await Homestay.findById(report.homestayId).select("status").lean();
    if (stay && ["live", "paused"].includes(stay.status)) {
      suspension = await suspendListing(admin, report.homestayId, `After a traveller report: ${note}`);
    }
  }

  await recordAudit({
    actor: admin,
    action: "REPORT_RESOLVED",
    targetType: "Report",
    targetId: report._id,
    note,
    meta: { action, homestayId: report.homestayId, reason: report.reason }
  });

  return { report, listingSuspended: Boolean(suspension) };
}
