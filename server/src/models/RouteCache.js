// Cached OpenRouteService road geometry between two places, used to draw the route
// on the map. Planning uses our own hillHours (Route model), not this distance.
// MongoDB deletes entries 30 days after fetchedAt.
import mongoose from "mongoose";

const THIRTY_DAYS = 30 * 24 * 60 * 60;

const routeCacheSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // "<fromId>-<toId>"
    geometry: {
      type: { type: String, enum: ["LineString"], required: true },
      coordinates: { type: [[Number]], required: true } // [[lng, lat], [lng, lat], ...]
    },
    distanceKm: { type: Number, min: 0 },
    fetchedAt: { type: Date, default: Date.now }
  },
  { timestamps: false, toJSON: { versionKey: false } }
);

routeCacheSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: THIRTY_DAYS });

export const RouteCache = mongoose.model("RouteCache", routeCacheSchema);
