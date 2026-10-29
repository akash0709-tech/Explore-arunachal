// A homestay listed by a host. It is built step by step in a 6-step wizard (saved as a
// draft after each step), then submitted for admin review. Only "live" homestays are public.
//
// Privacy: the exact address landmark and the verification documents are private.
// They use select:false, so they are only loaded when code asks for them explicitly
// (the host's own view and the admin review screen).
import mongoose from "mongoose";
import { pointSchema } from "./schemas/pointSchema.js";
import { monthField } from "./schemas/imageSchema.js";
import {
  HOMESTAY_STATUS,
  HOMESTAY_WIZARD_STEPS,
  APPROVAL_TYPES,
  DOCUMENT_SLOTS
} from "../utils/constants.js";

const photoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    fileId: { type: String, required: true },
    label: { type: String, trim: true }, // e.g. "Room", "View", "Kitchen"
    order: { type: Number, default: 0 }
  },
  { _id: true } // _id lets the host delete or reorder a single photo
);

// Verification files are PRIVATE on ImageKit: we store only the fileId and show admins a short-lived signed URL
const documentSchema = new mongoose.Schema(
  {
    slot: { type: String, enum: DOCUMENT_SLOTS, required: true }, // certificate | proof | id
    proofType: { type: String, trim: true }, // e.g. "Electricity bill"
    idType: { type: String, trim: true }, //    e.g. "Aadhaar"
    fileId: { type: String, required: true },
    fileName: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const homestaySchema = new mongoose.Schema(
  {
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Step 1: basics. Most fields are not "required" here because drafts are saved
    // half-filled; the submit service checks everything is complete before review.
    name: { type: String, trim: true, maxlength: 100 },
    ownerName: { type: String, trim: true },
    phone: { type: String, trim: true, match: [/^\d{10}$/, "Phone must be 10 digits"] },
    whatsapp: { type: String, trim: true, match: [/^\d{10}$/, "WhatsApp number must be 10 digits"] },
    description: { type: String, trim: true, maxlength: 2000 },

    // Step 2: location
    town: { type: mongoose.Schema.Types.ObjectId, ref: "Destination" },
    addressLandmark: { type: String, trim: true, select: false }, // shared only after contact
    approxLocation: { type: pointSchema }, // rough pin for the public map

    // Step 3: rooms, facilities and prices
    rooms: { type: Number, min: 1 },
    maxGuests: { type: Number, min: 1 },
    roomTypes: { type: [String], default: [] },
    facilities: { type: [String], default: [] },
    otherFacilities: { type: String, trim: true },
    pricePerNight: { type: Number, min: 0 },
    peakPrice: { type: Number, min: 0 },
    mealsIncluded: { type: Boolean, default: false },
    openMonths: { type: [monthField], default: [] },
    checkIn: { type: String, trim: true }, //  e.g. "12:00"
    checkOut: { type: String, trim: true }, // e.g. "10:00"

    // Step 4: photos (public)
    photos: { type: [photoSchema], default: [] },

    // Step 5: tourism-department approval and private documents
    approval: {
      type: { type: String, enum: APPROVAL_TYPES },
      licenceNumber: { type: String, trim: true },
      authority: { type: String, trim: true },
      validUntil: { type: Date },
      naReason: { type: String, trim: true } // why a licence is not applicable
    },
    documents: { type: [documentSchema], default: [], select: false },

    // Step 6: declarations, then submit
    declarations: {
      truthful: { type: Boolean, default: false },
      notGovtCertified: { type: Boolean, default: false } // host understands "Verified" is our check, not a govt certificate
    },

    // Review workflow
    status: { type: String, enum: HOMESTAY_STATUS, default: "draft" },
    currentStep: { type: Number, min: 1, max: HOMESTAY_WIZARD_STEPS, default: 1 },
    reviewNote: { type: String, trim: true }, // admin's message for changes_requested / rejected
    submittedAt: { type: Date },
    approvedAt: { type: Date },

    stats: {
      views: { type: Number, default: 0 },
      contactTaps: { type: Number, default: 0 } // Call / WhatsApp button taps
    },

    isSample: { type: Boolean, default: false } // seed data
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

homestaySchema.index({ town: 1, status: 1 }); //      "live stays in Tawang"
homestaySchema.index({ hostId: 1 }); //               host dashboard
homestaySchema.index({ status: 1, submittedAt: 1 }); // admin review queue, oldest first
homestaySchema.index({ name: "text" }); //            search box
homestaySchema.index({ approxLocation: "2dsphere" }); // stays map

export const Homestay = mongoose.model("Homestay", homestaySchema);
