// A place on the map. Most are tourist destinations (Tawang, Ziro, Mechuka...).
// The same collection also holds:
//   - waypoints (isWaypoint): places we pass through, such as Bhalukpong or Sela Pass
//   - start cities (isStartCity): where trips begin, such as Guwahati
// Keeping them together means a Route can always point from one Destination to another.
import mongoose from "mongoose";
import { pointSchema } from "./schemas/pointSchema.js";
import { imageSchema, monthField } from "./schemas/imageSchema.js";

const destinationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true }, // e.g. "tawang"
    district: { type: String, trim: true },
    altitudeM: { type: Number, min: 0 }, // used for high-altitude night warnings
    location: { type: pointSchema, required: true },

    bestMonths: { type: [monthField], default: [] },
    overview: { type: String, trim: true },
    attractions: {
      type: [
        new mongoose.Schema(
          { name: { type: String, required: true, trim: true }, note: { type: String, trim: true } },
          { _id: false }
        )
      ],
      default: []
    },

    // Permits that apply here, plus a short human note for local permissions (e.g. Bum La)
    permitRuleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "PermitRule" }],
    extraPermitNote: { type: String, trim: true },

    coverImage: { type: imageSchema },

    isWaypoint: { type: Boolean, default: false },
    isPass: { type: Boolean, default: false }, // a mountain pass: the planner never ends a day here
    isStartCity: { type: Boolean, default: false },
    isSample: { type: Boolean, default: false } // true for seed data, shown as "sample" in the UI
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

destinationSchema.index({ location: "2dsphere" }); // "nearest town", map queries
destinationSchema.index({ isWaypoint: 1, isStartCity: 1 }); // pickers that list only destinations or only start cities

export const Destination = mongoose.model("Destination", destinationSchema);
