// A permanent record of every admin decision: who did what, to which item, and why.
// Entries are only ever added, never edited.
import mongoose from "mongoose";
import { ROLES, AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "../utils/constants.js";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actorRole: { type: String, enum: ROLES, required: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true }, // e.g. HOMESTAY_APPROVED
    targetType: { type: String, enum: AUDIT_TARGET_TYPES, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "targetType" },
    note: { type: String, trim: true }, // the reason the admin typed
    meta: { type: mongoose.Schema.Types.Mixed } // extra details, e.g. { fromStatus: "pending", toStatus: "live" }
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

auditLogSchema.index({ targetId: 1, createdAt: -1 }); // history of one homestay / user / rule
auditLogSchema.index({ actorId: 1, createdAt: -1 }); //  what one admin did

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
