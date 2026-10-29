// A road segment between two places (both are Destination documents, which may be
// waypoints such as Sela Pass or a start city such as Guwahati).
// hillHours is our own realistic drive time for hill roads, NOT the map's estimate.
// The planner multiplies it by monsoonFactor (June-September) or winterFactor (snow on passes, December-March).
import mongoose from "mongoose";

const routeSchema = new mongoose.Schema(
  {
    fromId: { type: mongoose.Schema.Types.ObjectId, ref: "Destination", required: true },
    toId: { type: mongoose.Schema.Types.ObjectId, ref: "Destination", required: true },
    from: { type: String, required: true, trim: true }, // names copied for easy reading in the DB
    to: { type: String, required: true, trim: true },

    roadKm: { type: Number, required: true, min: 0 },
    hillHours: { type: Number, required: true, min: 0 },
    monsoonFactor: { type: Number, default: 1.25, min: 1 },
    winterFactor: { type: Number, default: 1.4, min: 1 },
    isPass: { type: Boolean, default: false }, // crosses a high pass (winterFactor applies)

    // Indicative fares in INR
    fares: {
      bus: { type: Number, min: 0 }, //              per person
      sharedTaxi: { type: Number, min: 0 }, //       per person
      privateTaxiPerKm: { type: Number, min: 0 } //  per vehicle, per km
    },

    isSample: { type: Boolean, default: false } // seed data: hours and fares are estimates
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

// One segment per direction. The planner also looks up the reverse (toId -> fromId).
routeSchema.index({ fromId: 1, toId: 1 }, { unique: true });
routeSchema.index({ toId: 1 });

export const Route = mongoose.model("Route", routeSchema);
