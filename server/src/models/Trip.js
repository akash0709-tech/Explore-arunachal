// A trip planned and saved by a traveller. The generated day-by-day plan, cost and
// permit details are stored INSIDE the trip (embedded), so a saved trip is one
// document that can be cached and opened offline as-is.
import mongoose from "mongoose";
import { monthField } from "./schemas/imageSchema.js";
import { CITIZENSHIP, TRANSPORT_MODES, PLAN_DAY_TYPES, WARNING_LEVELS } from "../utils/constants.js";

const planDaySchema = new mongoose.Schema(
  {
    dayNumber: { type: Number, required: true, min: 1 },
    type: { type: String, enum: PLAN_DAY_TYPES, required: true }, // drive day or local sightseeing day
    fromName: { type: String, trim: true },
    toName: { type: String, trim: true },
    via: { type: [String], default: [] }, // waypoints, e.g. ["Bhalukpong", "Sela Pass"]
    km: { type: Number, min: 0, default: 0 },
    hours: { type: Number, min: 0, default: 0 }, // hill- and season-adjusted
    sights: { type: [String], default: [] },
    stayName: { type: String, trim: true },
    stayAltitudeM: { type: Number, min: 0 }
  },
  { _id: false }
);

const warningSchema = new mongoose.Schema(
  {
    level: { type: String, enum: WARNING_LEVELS, default: "info" },
    text: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const checklistItemSchema = new mongoose.Schema(
  {
    item: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false }
  },
  { _id: true } // _id so one item can be ticked via PATCH
);

const tripSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, trim: true, maxlength: 120 },

    // What the traveller asked for
    citizen: { type: String, enum: CITIZENSHIP, required: true },
    startId: { type: mongoose.Schema.Types.ObjectId, ref: "Destination", required: true },
    destinationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Destination" }],
    days: { type: Number, required: true, min: 1, max: 30 },
    travellers: { type: Number, default: 1, min: 1, max: 20 },
    month: { ...monthField, required: true },
    interests: { type: [String], default: [] },
    budgetPerPerson: { type: Number, min: 0 },
    transportMode: { type: String, enum: TRANSPORT_MODES, default: "shared" },

    // What the planner produced (a snapshot at the time of planning)
    plan: {
      days: { type: [planDaySchema], default: [] },
      warnings: { type: [warningSchema], default: [] },
      totalKm: { type: Number, default: 0 },
      minimumDays: { type: Number, default: 0 } // fewest days this route can be done in
    },
    // All amounts are per person, in INR
    cost: {
      transport: { type: Number, default: 0 },
      stay: { type: Number, default: 0 },
      food: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      tier: { type: String, trim: true }, // stay tier: "simple", "comfortable" or "premium"
      budgetDifference: { type: Number } // budget minus total: positive = under budget, negative = over
    },
    // Copy of the permit rule, so the trip still shows it offline (with its "last verified" date)
    permitSnapshot: {
      code: { type: String },
      title: { type: String },
      documents: { type: [String], default: [] },
      steps: { type: [String], default: [] },
      officialUrl: { type: String },
      lastVerifiedAt: { type: Date }
    },

    savedHostIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Homestay" }],
    checklist: { type: [checklistItemSchema], default: [] }
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

// "My trips", newest first
tripSchema.index({ userId: 1, createdAt: -1 });

export const Trip = mongoose.model("Trip", tripSchema);
