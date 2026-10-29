// Zod schemas for /api/admin
import { z } from "zod";
import {
  HOMESTAY_STATUS,
  REVIEW_DECISIONS,
  REVIEW_CHECKLIST_ITEMS,
  CHECKLIST_VALUES,
  REPORT_STATUS,
  REPORT_ACTIONS,
  ARUNACHAL_BOUNDS
} from "../utils/constants.js";
import { objectIdSchema, slugSchema, paginationQuery } from "./common.validator.js";

const note = z.string().trim().max(1000);
const requiredNote = note.min(5, "Please write a note of at least 5 characters for the host");
const text = (max) => z.string().trim().min(1).max(max);
const month = z.number().int().min(1).max(12);

export const idParams = z.object({ id: objectIdSchema });

// ----- Homestay review -----

// GET /homestays?status=pending&town=tawang&q=pema&sort=oldest&page=1
export const queueQuery = z.object({
  status: z.enum(HOMESTAY_STATUS).default("pending"),
  town: z.string().trim().toLowerCase().max(60).optional(),
  q: z.string().trim().max(60).optional(),
  sort: z.enum(["oldest", "newest"]).default("oldest"),
  ...paginationQuery
});

// Each checklist item: "valid" | "invalid" | "not_applicable" (true/false also accepted)
const checklistValue = z
  .union([z.enum(CHECKLIST_VALUES), z.boolean()])
  .transform((value) => (value === true ? "valid" : value === false ? "invalid" : value));

// POST /homestays/:id/decision
export const decisionBody = z
  .object({
    decision: z.enum(REVIEW_DECISIONS, { message: "decision must be approve, request_changes or reject" }),
    note: note.optional(),
    checklist: z
      .object(Object.fromEntries(REVIEW_CHECKLIST_ITEMS.map((item) => [item, checklistValue.optional()])))
      .optional()
  })
  .superRefine((body, ctx) => {
    if (body.decision !== "approve" && (!body.note || body.note.length < 5)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: "A note for the host is required when requesting changes or rejecting"
      });
    }
    if (body.decision === "approve" && !body.checklist) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["checklist"],
        message: "Complete the review checklist to approve"
      });
    }
  });

// POST /homestays/bulk-remind
export const bulkRemindBody = z.object({
  ids: z
    .array(objectIdSchema)
    .min(1)
    .max(50)
    .transform((ids) => [...new Set(ids)])
});

// POST /homestays/:id/suspend and /reverify need a reason; /reinstate may have one
export const requiredNoteBody = z.object({ note: requiredNote });
export const optionalNoteBody = z.object({ note: note.optional() });

// GET /hosts?status=live
export const hostsQuery = z.object({
  status: z.enum(["live", "paused", "suspended"]).default("live"),
  ...paginationQuery
});

// ----- Reports -----

export const reportsQuery = z.object({
  status: z.enum(REPORT_STATUS).default("open"),
  ...paginationQuery
});

export const resolveReportBody = z
  .object({
    action: z.enum(REPORT_ACTIONS, { message: "action must be dismiss or suspend_listing" }),
    note: note.optional()
  })
  .superRefine((body, ctx) => {
    if (body.action === "suspend_listing" && (!body.note || body.note.length < 5)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: "Explain to the host why the listing is suspended"
      });
    }
  });

// ----- Permit rules -----

const httpsUrl = z
  .string()
  .trim()
  .url("officialUrl must be a full URL")
  .refine((url) => url.startsWith("https://"), { message: "officialUrl must start with https://" });

export const permitUpdateBody = z
  .object({
    title: text(120).optional(),
    whoNeedsIt: text(300).optional(),
    documents: z.array(text(200)).max(20).optional(),
    steps: z.array(text(300)).max(20).optional(),
    officialUrl: httpsUrl.optional(),
    officialLabel: text(80).optional(),
    notes: z.string().trim().max(1000).optional()
  })
  .refine((body) => Object.keys(body).length > 0, { message: "Nothing to update" });

// ----- Destinations -----

const latLng = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).refine(
  ({ lat, lng }) =>
    // Start cities can be outside Arunachal (e.g. Guwahati), so allow the wider North-East
    lat >= ARUNACHAL_BOUNDS.minLat - 2 &&
    lat <= ARUNACHAL_BOUNDS.maxLat &&
    lng >= ARUNACHAL_BOUNDS.minLng - 2 &&
    lng <= ARUNACHAL_BOUNDS.maxLng,
  { message: "Location must be in North-East India" }
);

const destinationFields = {
  name: text(80),
  slug: slugSchema.optional(), // made from the name when missing
  district: text(80).optional(),
  altitudeM: z.number().min(0).max(9000),
  location: latLng,
  bestMonths: z.array(month).max(12).default([]),
  overview: z.string().trim().max(1000).optional(),
  attractions: z
    .array(z.object({ name: text(80), note: z.string().trim().max(200).optional() }))
    .max(20)
    .default([]),
  extraPermitNote: z.string().trim().max(300).optional(),
  isWaypoint: z.boolean().default(false),
  isPass: z.boolean().default(false),
  isStartCity: z.boolean().default(false),
  inArunachal: z.boolean().default(true) // links the ILP/PAP rules automatically
};

export const createDestinationBody = z.object(destinationFields);

// PATCH: same fields, all optional, no defaults; the slug never changes (links depend on it)
export const updateDestinationBody = z
  .object({
    name: destinationFields.name.optional(),
    district: destinationFields.district,
    altitudeM: destinationFields.altitudeM.optional(),
    location: latLng.optional(),
    bestMonths: z.array(month).max(12).optional(),
    overview: destinationFields.overview,
    attractions: z
      .array(z.object({ name: text(80), note: z.string().trim().max(200).optional() }))
      .max(20)
      .optional(),
    extraPermitNote: destinationFields.extraPermitNote,
    isWaypoint: z.boolean().optional(),
    isPass: z.boolean().optional(),
    isStartCity: z.boolean().optional()
  })
  .refine((body) => Object.keys(body).length > 0, { message: "Nothing to update" });

// ----- Road segments -----

const fares = z.object({
  bus: z.number().min(0).optional(),
  sharedTaxi: z.number().min(0).optional(),
  privateTaxiPerKm: z.number().min(0).optional()
});

export const createRouteBody = z
  .object({
    fromId: objectIdSchema,
    toId: objectIdSchema,
    roadKm: z.number().positive().max(2000),
    hillHours: z.number().positive().max(48),
    monsoonFactor: z.number().min(1).max(3).default(1.25),
    winterFactor: z.number().min(1).max(3).default(1.4),
    isPass: z.boolean().default(false),
    fares: fares.default({})
  })
  .refine((body) => body.fromId !== body.toId, {
    message: "A road must connect two different places",
    path: ["toId"]
  });

// PATCH: numbers and flags only. To connect different places, create a new segment.
export const updateRouteBody = z
  .object({
    roadKm: z.number().positive().max(2000).optional(),
    hillHours: z.number().positive().max(48).optional(),
    monsoonFactor: z.number().min(1).max(3).optional(),
    winterFactor: z.number().min(1).max(3).optional(),
    isPass: z.boolean().optional(),
    fares: fares.optional()
  })
  .refine((body) => Object.keys(body).length > 0, { message: "Nothing to update" });

// ----- Audit log -----

export const auditQuery = z.object({
  targetId: objectIdSchema.optional(),
  ...paginationQuery
});
