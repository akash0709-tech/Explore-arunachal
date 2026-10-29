// Formatting helpers used across pages (Indian English conventions).

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "2026-10-28T10:20:11Z" -> "28 Oct 2026".
 * Always in India time, so every visitor sees the same date as the admin team
 * (otherwise a rule verified at 00:19 IST would show the previous day abroad).
 */
export function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata"
  });
}

/** 3048 -> "3,048 m" */
export const formatAltitude = (metres) =>
  metres == null ? "" : `${Math.round(metres).toLocaleString("en-IN")} m`;

/** 507 -> "507 km" */
export const formatKm = (km) => `${Math.round(km).toLocaleString("en-IN")} km`;

/** 16.75 -> "16 h 45 min", 7.5 -> "7 h 30 min", 4 -> "4 h" */
export function formatHours(hours) {
  const totalMinutes = Math.round((hours * 60) / 15) * 15;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** 25000 -> "₹25,000" */
export const formatRupees = (amount) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

/**
 * Month numbers -> short ranges. Wraps around the year end.
 *   [3,4,5,9,10,11] -> "Mar–May, Sep–Nov"     [10,11,12,1,2,3] -> "Oct–Mar"
 */
export function formatMonths(months = []) {
  if (months.length === 0) return "";
  if (months.length === 12) return "All year";
  const set = new Set(months);
  // Start each range at a month whose previous month is not in the set
  const starts = [...set].filter((m) => !set.has(m === 1 ? 12 : m - 1)).sort((a, b) => a - b);
  return starts
    .map((start) => {
      let end = start;
      while (set.has(end === 12 ? 1 : end + 1) && (end === 12 ? 1 : end + 1) !== start)
        end = end === 12 ? 1 : end + 1;
      return end === start ? MONTHS[start - 1] : `${MONTHS[start - 1]}–${MONTHS[end - 1]}`;
    })
    .join(", ");
}

/** Whole days since a date (for "verified 12 days ago" checks) */
export const daysSince = (value) =>
  value ? Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000) : null;
