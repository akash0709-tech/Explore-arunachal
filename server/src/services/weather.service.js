// Weather forecasts from Open-Meteo (free, no API key), cached in MongoDB.
//
// Flow for every request:
//   1. Fresh cache entry (< 3 h old)?          -> return it ("weather cache hit")
//   2. Otherwise call Open-Meteo (6 s timeout) -> save to cache and return
//   3. Open-Meteo failed but an old entry exists -> return it with stale: true
//   4. Nothing at all                          -> 503 with a clear message
import axios from "axios";
import { WeatherCache, Destination } from "../models/index.js";
import { WEATHER_FRESH_MS } from "../models/WeatherCache.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 6000;
const FORECAST_DAYS_FETCHED = 16; // Open-Meteo's maximum; one cache entry serves any ?days=

// WMO weather codes -> short label and an icon name for the frontend
const WEATHER_CODES = [
  { codes: [0], label: "Clear sky", icon: "sun" },
  { codes: [1, 2], label: "Partly cloudy", icon: "cloud-sun" },
  { codes: [3], label: "Overcast", icon: "cloud" },
  { codes: [45, 48], label: "Fog", icon: "fog" },
  { codes: [51, 53, 55, 56, 57], label: "Drizzle", icon: "drizzle" },
  { codes: [61, 63, 65, 66, 67, 80, 81, 82], label: "Rain", icon: "rain" },
  { codes: [71, 73, 75, 77, 85, 86], label: "Snow", icon: "snow" },
  { codes: [95, 96, 99], label: "Thunderstorm", icon: "storm" }
];

export function describeWeatherCode(code) {
  const match = WEATHER_CODES.find((entry) => entry.codes.includes(code));
  return match ? { label: match.label, icon: match.icon } : { label: "Unknown", icon: "cloud" };
}

// How risky the hill roads are that day: heavy rain means landslides, snow means closed passes
export function roadRiskFor({ precipitationMm, snowfallCm }) {
  if (precipitationMm > 30 || snowfallCm > 2) return "high";
  if (precipitationMm > 10) return "medium";
  return "low";
}

// Nearby points share a cache entry: 27.5861, 91.8594 -> "27.59,91.86"
const cacheKey = (lat, lng) => `${lat.toFixed(2)},${lng.toFixed(2)}`;

// Open-Meteo returns parallel arrays (daily.time[i], daily.temperature_2m_max[i] ...).
// We turn them into one easy object per day.
function toDays(daily) {
  const codes = daily.weather_code ?? daily.weathercode ?? [];
  return daily.time.map((date, i) => {
    const precipitationMm = daily.precipitation_sum[i] ?? 0;
    const snowfallCm = daily.snowfall_sum[i] ?? 0;
    return {
      date,
      tempMaxC: daily.temperature_2m_max[i],
      tempMinC: daily.temperature_2m_min[i],
      precipitationMm,
      precipitationProbability: daily.precipitation_probability_max[i],
      snowfallCm,
      weatherCode: codes[i],
      ...describeWeatherCode(codes[i]),
      roadRisk: roadRiskFor({ precipitationMm, snowfallCm })
    };
  });
}

async function fetchFromOpenMeteo(lat, lng) {
  const { data } = await axios.get(OPEN_METEO_URL, {
    timeout: TIMEOUT_MS,
    params: {
      latitude: lat,
      longitude: lng,
      daily: [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "precipitation_probability_max",
        "snowfall_sum",
        "weather_code"
      ].join(","),
      timezone: "Asia/Kolkata",
      forecast_days: FORECAST_DAYS_FETCHED
    }
  });
  return toDays(data.daily);
}

const buildResponse = (lat, lng, entry, days, stale) => ({
  location: { lat, lng },
  days: entry.data.slice(0, days),
  fetchedAt: entry.fetchedAt,
  stale,
  source: "Open-Meteo"
});

export async function getForecast({ lat, lng, days = 7 }) {
  const key = cacheKey(lat, lng);
  const cached = await WeatherCache.findOne({ key }).lean();

  // 1. Fresh cache
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < WEATHER_FRESH_MS) {
    logger.info(`weather cache hit ${key}`);
    return buildResponse(lat, lng, cached, days, false);
  }

  // 2. Ask Open-Meteo
  try {
    const forecastDays = await fetchFromOpenMeteo(lat, lng);
    const entry = await WeatherCache.findOneAndUpdate(
      { key },
      { data: forecastDays, fetchedAt: new Date() },
      { upsert: true, returnDocument: "after", lean: true }
    );
    logger.info(`weather fetched from Open-Meteo ${key}`);
    return buildResponse(lat, lng, entry, days, false);
  } catch (err) {
    logger.warn(`Open-Meteo request failed for ${key}: ${err.message}`);

    // 3. Old forecast is better than nothing (the UI shows "last updated ...")
    if (cached) return buildResponse(lat, lng, cached, days, true);

    // 4. Nothing to show
    throw new ApiError(503, "Weather is unavailable right now. Please try again in a few minutes.");
  }
}

export async function getForecastForDestination(slug, days = 7) {
  const destination = await Destination.findOne({ slug }).select("name slug altitudeM location").lean();
  if (!destination) throw ApiError.notFound(`No destination found for "${slug}"`);

  const [lng, lat] = destination.location.coordinates; // GeoJSON order is [lng, lat]
  const forecast = await getForecast({ lat, lng, days });
  return {
    destination: { name: destination.name, slug: destination.slug, altitudeM: destination.altitudeM },
    ...forecast
  };
}
