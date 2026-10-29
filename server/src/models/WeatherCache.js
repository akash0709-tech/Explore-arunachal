// Cached Open-Meteo forecast for a location. Places closer than ~1 km share one entry
// (lat/lng rounded to 2 decimals).
//
// Two time limits:
//   - FRESH for 3 hours: within that, we answer from the cache without calling Open-Meteo
//     (checked in weather.service.js using fetchedAt)
//   - KEPT for 24 hours: if Open-Meteo is down, we can still show the last forecast,
//     marked stale. After 24 hours MongoDB deletes the entry (TTL index).
import mongoose from "mongoose";

export const WEATHER_FRESH_MS = 3 * 60 * 60 * 1000;
const KEEP_SECONDS = 24 * 60 * 60;

const weatherCacheSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. "27.59,91.86"
    data: { type: mongoose.Schema.Types.Mixed, required: true }, // our simplified daily forecast
    fetchedAt: { type: Date, default: Date.now }
  },
  { timestamps: false, toJSON: { versionKey: false } }
);

weatherCacheSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: KEEP_SECONDS });

export const WeatherCache = mongoose.model("WeatherCache", weatherCacheSchema);
