// The audit log: who did what, to which item, and why.
// Called by services after an important change (submit, approve, suspend...).
import { AuditLog } from "../models/index.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";

export function recordAudit({ actor, action, targetType, targetId, note, meta }) {
  return AuditLog.create({
    actorId: actor.id,
    actorRole: actor.role,
    action,
    targetType,
    targetId,
    note,
    meta
  });
}

// GET /api/admin/audit?targetId=: newest first
export async function listAudit({ targetId, page, limit }) {
  const { skip, ...pagination } = getPagination({ page, limit }, { defaultLimit: 30, maxLimit: 100 });
  const filter = targetId ? { targetId } : {};
  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("actorId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pagination.limit)
      .lean(),
    AuditLog.countDocuments(filter)
  ]);
  return { items, pagination: buildPaginationMeta({ ...pagination, total }) };
}
