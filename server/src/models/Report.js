// A traveller's report about a homestay listing (wrong price, unreachable host...).
// Admins handle it and record what they did.
import mongoose from "mongoose";
import { REPORT_REASONS, REPORT_STATUS } from "../utils/constants.js";

const reportSchema = new mongoose.Schema(
  {
    homestayId: { type: mongoose.Schema.Types.ObjectId, ref: "Homestay", required: true },
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    note: { type: String, trim: true, maxlength: 1000 },

    status: { type: String, enum: REPORT_STATUS, default: "open" },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
    action: { type: String, trim: true } // e.g. "Asked host to update price", "Listing suspended"
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

reportSchema.index({ status: 1, createdAt: -1 }); // admin inbox: open reports, newest first
reportSchema.index({ homestayId: 1 }); //          all reports for one listing

export const Report = mongoose.model("Report", reportSchema);
