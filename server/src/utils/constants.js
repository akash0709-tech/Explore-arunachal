// Shared lists of allowed values. Models use them as enums, and the Zod
// validators (later tasks) import the same lists, so they never drift apart.

export const ROLES = ["traveller", "host", "admin"];
export const USER_STATUS = ["active", "suspended"];

export const OTP_CHANNELS = ["email", "mobile"];
export const OTP_PURPOSES = ["signup", "reset"];
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_TTL_MINUTES = 10;

export const PERMIT_CODES = ["ILP", "PAP", "EXTRA"];
export const PERMIT_APPLIES_TO = ["indian", "foreign", "all"];
export const CITIZENSHIP = ["indian", "foreign"];

export const HOMESTAY_STATUS = [
  "draft", //             host is still filling the 6-step wizard
  "pending", //           submitted, waiting for admin review
  "changes_requested", // admin asked the host to fix something
  "live", //              approved and visible to travellers
  "paused", //            host hid it temporarily
  "rejected", //          admin rejected it
  "suspended" //          admin took it down (e.g. after a report)
];
export const HOMESTAY_WIZARD_STEPS = 6;
export const APPROVAL_TYPES = ["required", "not_applicable"];
export const DOCUMENT_SLOTS = ["certificate", "proof", "id"];

export const TRANSPORT_MODES = ["shared", "private"];
export const PLAN_DAY_TYPES = ["drive", "local"];
export const WARNING_LEVELS = ["info", "warn"];

export const REPORT_REASONS = ["wrong_price", "wrong_location_or_photos", "host_unreachable", "safety"];
export const REPORT_STATUS = ["open", "resolved"];

export const AUDIT_ACTIONS = [
  "HOMESTAY_SUBMITTED",
  "HOMESTAY_APPROVED",
  "HOMESTAY_CHANGES_REQUESTED",
  "HOMESTAY_REJECTED",
  "HOMESTAY_SUSPENDED",
  "HOMESTAY_REINSTATED",
  "HOMESTAY_REVERIFICATION_REQUESTED",
  "HOST_SUSPENDED",
  "HOST_REVERIFIED",
  "PERMIT_UPDATED",
  "PERMIT_VERIFIED",
  "REPORT_RESOLVED",
  "DESTINATION_CREATED",
  "DESTINATION_UPDATED",
  "ROUTE_CREATED",
  "ROUTE_UPDATED"
];
export const AUDIT_TARGET_TYPES = ["Homestay", "User", "PermitRule", "Report", "Destination", "Route"];

// Admin review
export const REVIEW_DECISIONS = ["approve", "request_changes", "reject"];
export const REVIEW_CHECKLIST_ITEMS = ["certificate", "proof", "id", "namesMatch", "photosMatch"];
export const CHECKLIST_VALUES = ["valid", "invalid", "not_applicable"];
export const REPORT_ACTIONS = ["dismiss", "suspend_listing"];
export const PERMIT_STALE_DAYS = 30;

// A host can change photos and documents only while the listing is not under review or live
export const HOMESTAY_EDITABLE_STATUS = ["draft", "changes_requested"];
export const MAX_HOMESTAY_PHOTOS = 10;
export const MIN_HOMESTAY_PHOTOS = 3;
export const MAX_DRAFTS_PER_HOST = 5;

// Traveller interactions with a listing, used for the host dashboard
export const STAY_EVENT_TYPES = ["view", "contact_tap"];
export const CONTACT_CHANNELS = ["call", "whatsapp"];

// Rough box around Arunachal Pradesh, to catch map pins dropped in the wrong place
export const ARUNACHAL_BOUNDS = { minLat: 26.5, maxLat: 29.6, minLng: 91.4, maxLng: 97.5 };
