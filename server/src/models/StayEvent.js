// One traveller interaction with a live homestay: a page view or a Call/WhatsApp tap.
//
// Why a separate collection? Homestay.stats only holds lifetime totals. These events
// let the host dashboard show "last 30 days", and their unique index makes sure the
// same viewer is counted at most once per listing per day.
// MongoDB deletes events after 90 days (TTL index).
import mongoose from "mongoose";
import { STAY_EVENT_TYPES, CONTACT_CHANNELS } from "../utils/constants.js";

const NINETY_DAYS = 90 * 24 * 60 * 60;

const stayEventSchema = new mongoose.Schema(
  {
    homestayId: { type: mongoose.Schema.Types.ObjectId, ref: "Homestay", required: true },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // copied for fast dashboard counts
    type: { type: String, enum: STAY_EVENT_TYPES, required: true },
    channel: { type: String, enum: [...CONTACT_CHANNELS, "none"], default: "none" }, // call / whatsapp for taps
    viewerKey: { type: String, required: true }, // user id, or a hash of the IP for guests (never the raw IP)
    day: { type: String, required: true } // "2026-10-29" (India time)
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { versionKey: false } }
);

// Same viewer + same listing + same kind of event + same day = counted once
stayEventSchema.index({ homestayId: 1, type: 1, channel: 1, viewerKey: 1, day: 1 }, { unique: true });
stayEventSchema.index({ hostId: 1, type: 1, createdAt: -1 }); // dashboard: last 30 days
stayEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: NINETY_DAYS });

export const StayEvent = mongoose.model("StayEvent", stayEventSchema);
