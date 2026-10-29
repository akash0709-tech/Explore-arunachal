// One permit rule shown by the Permit Wizard. Admins edit these and mark them verified.
// We never issue permits; we explain them and link to the official portal.
//   ILP   = Inner Line Permit, for Indian citizens from outside Arunachal
//   PAP   = Protected Area Permit, for foreign nationals
//   EXTRA = local permission for specific areas (e.g. Bum La, Sangetsar Lake near Tawang)
import mongoose from "mongoose";
import { PERMIT_CODES, PERMIT_APPLIES_TO } from "../utils/constants.js";

const permitRuleSchema = new mongoose.Schema(
  {
    code: { type: String, enum: PERMIT_CODES, required: true },
    appliesTo: { type: String, enum: PERMIT_APPLIES_TO, required: true },
    title: { type: String, required: true, trim: true },
    whoNeedsIt: { type: String, trim: true },
    documents: { type: [String], default: [] }, // e.g. "Photo ID (Aadhaar / Passport)"
    steps: { type: [String], default: [] }, //     how to apply, in order
    officialUrl: { type: String, trim: true }, //  e.g. https://www.eilp.arunachal.gov.in
    officialLabel: { type: String, trim: true }, // button text, e.g. "Apply on eILP portal"

    // EXTRA rules only: the destination slugs this rule covers, e.g. ["tawang"]
    areaScope: { type: [String], default: [] },

    // "Last verified" date shown to travellers, and which admin checked it
    lastVerifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: { type: String, trim: true }
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

// The wizard asks: "which rules apply to an Indian / foreign traveller?"
permitRuleSchema.index({ code: 1, appliesTo: 1 });
permitRuleSchema.index({ areaScope: 1 });

export const PermitRule = mongoose.model("PermitRule", permitRuleSchema);
