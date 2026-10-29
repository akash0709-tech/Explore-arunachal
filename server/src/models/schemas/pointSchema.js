// Reusable GeoJSON Point: { type: "Point", coordinates: [longitude, latitude] }
// Note the order: GeoJSON puts LONGITUDE first. Used with a 2dsphere index for "near me" queries.
import mongoose from "mongoose";

export const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: {
      type: [Number],
      default: undefined, // never create an empty array: a 2dsphere index rejects it
      required: true,
      validate: {
        validator: ([lng, lat] = []) =>
          Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90,
        message: "coordinates must be [longitude, latitude]"
      }
    }
  },
  { _id: false }
);
