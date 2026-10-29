// Zod schemas for /api/host. One schema per wizard step.
import { z } from "zod";
import { ARUNACHAL_BOUNDS } from "../utils/constants.js";
import { objectIdSchema, paginationQuery } from "./common.validator.js";
import { phoneSchema } from "./auth.validator.js";

const shortText = (max) => z.string().trim().max(max);
const month = z.number().int().min(1).max(12);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour time like 12:00");

// ----- Step 1: Basics -----
const step1 = z
  .object({
    name: shortText(100).min(3, "Homestay name is required"),
    ownerName: shortText(80).min(2, "Owner name is required"),
    phone: phoneSchema,
    whatsapp: phoneSchema.optional(),
    sameAsPhone: z.boolean().default(false), // "my WhatsApp number is the same as my phone"
    description: shortText(300).optional(),
    town: objectIdSchema,
    addressLandmark: shortText(200).optional(), // private: shown only to the host and admins
    approxLocation: z
      .object({ lat: z.number(), lng: z.number() })
      .refine(
        ({ lat, lng }) =>
          lat >= ARUNACHAL_BOUNDS.minLat &&
          lat <= ARUNACHAL_BOUNDS.maxLat &&
          lng >= ARUNACHAL_BOUNDS.minLng &&
          lng <= ARUNACHAL_BOUNDS.maxLng,
        { message: "The pin must be inside Arunachal Pradesh" }
      )
  })
  .transform(({ sameAsPhone, ...data }) => ({ ...data, whatsapp: sameAsPhone ? data.phone : data.whatsapp }));

// ----- Step 2: Photos (uploaded separately; nothing to send) -----
const step2 = z.object({}).strict();

// ----- Step 3: Rooms -----
const step3 = z.object({
  rooms: z.number().int().min(1).max(20),
  maxGuests: z.number().int().min(1).max(60),
  roomTypes: z.array(shortText(40).min(1)).max(10).default([]),
  facilities: z.array(shortText(40).min(1)).max(30).default([]),
  otherFacilities: shortText(200).optional(),
  pricePerNight: z.number().positive("Price per night must be more than 0").max(100_000),
  peakPrice: z.number().positive().max(100_000).optional(),
  mealsIncluded: z.boolean().default(false),
  openMonths: z.array(month).max(12).default([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
  checkIn: time.optional(),
  checkOut: time.optional()
});

// ----- Step 4: Tourism approval -----
const step4 = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("required"),
    licenceNumber: shortText(60).min(1, "Licence number is required"),
    authority: shortText(120).optional(),
    validUntil: z.coerce.date().optional()
  }),
  z.object({
    type: z.literal("not_applicable"),
    naReason: shortText(300).min(5, "Explain why no licence is needed")
  })
]);

// ----- Step 5: Proof and ID (files uploaded separately) -----
const step5 = z.object({
  proofType: shortText(60).min(1, "Say what kind of proof this is"),
  idType: shortText(60).min(1, "Say what kind of ID this is")
});

// ----- Step 6: Review -----
const step6 = z.object({}).strict();

export const STEP_SCHEMAS = { 1: step1, 2: step2, 3: step3, 4: step4, 5: step5, 6: step6 };

export const homestayIdParams = z.object({ id: objectIdSchema });

export const stepParams = z.object({
  id: objectIdSchema,
  step: z.coerce.number().int().min(1, "step must be 1-6").max(6, "step must be 1-6")
});

// POST /homestays/:id/submit
export const submitBody = z.object({
  truthful: z.literal(true, { errorMap: () => ({ message: "Confirm that the details are true" }) }),
  notGovtCertified: z.literal(true, {
    errorMap: () => ({ message: "Confirm you understand 'Verified' is not a government certificate" })
  })
});

export const listMyHomestaysQuery = z.object({ ...paginationQuery });
