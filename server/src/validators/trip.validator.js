// Zod schemas for /api/trips
import { z } from "zod";
import { CITIZENSHIP, TRANSPORT_MODES } from "../utils/constants.js";
import { objectIdSchema, paginationQuery } from "./common.validator.js";

// The traveller's choices. No defaults here, so the PATCH schema can reuse them
// as "optional" without silently filling in values the user did not send.
const planFields = {
  citizen: z.enum(CITIZENSHIP, { message: "citizen must be indian or foreign" }),
  startId: objectIdSchema,
  destinationIds: z
    .array(objectIdSchema)
    .min(1, "Choose at least one destination")
    .max(6, "Choose at most 6 destinations")
    .transform((ids) => [...new Set(ids)]),
  days: z.number().int().min(1, "At least 1 day").max(30, "At most 30 days"),
  travellers: z.number().int().min(1).max(20),
  month: z.number().int().min(1).max(12),
  budgetPerPerson: z.number().min(0).max(1_000_000),
  transportMode: z.enum(TRANSPORT_MODES, { message: "transportMode must be shared or private" }),
  interests: z.array(z.string().trim().min(1).max(40)).max(10)
};

// POST /api/trips/plan (preview, nothing saved)
export const planTripSchema = z.object({
  ...planFields,
  travellers: planFields.travellers.default(1),
  budgetPerPerson: planFields.budgetPerPerson.optional(),
  transportMode: planFields.transportMode.default("shared"),
  interests: planFields.interests.default([])
});

// POST /api/trips (save)
export const createTripSchema = planTripSchema.extend({
  title: z.string().trim().min(1).max(120).optional()
});

// PATCH /api/trips/:id. Any mix of:
//   - new planning choices (the plan is recalculated)
//   - title
//   - checklist: [{ id, done }] to tick or untick items
//   - addHostId / removeHostId for saved homestays
export const updateTripSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    citizen: planFields.citizen.optional(),
    startId: planFields.startId.optional(),
    destinationIds: planFields.destinationIds.optional(),
    days: planFields.days.optional(),
    travellers: planFields.travellers.optional(),
    month: planFields.month.optional(),
    budgetPerPerson: planFields.budgetPerPerson.nullable().optional(), // null removes the budget
    transportMode: planFields.transportMode.optional(),
    interests: planFields.interests.optional(),
    checklist: z
      .array(z.object({ id: objectIdSchema, done: z.boolean() }))
      .min(1)
      .max(50)
      .optional(),
    addHostId: objectIdSchema.optional(),
    removeHostId: objectIdSchema.optional()
  })
  .refine((body) => Object.keys(body).length > 0, { message: "Nothing to update" });

export const tripIdParams = z.object({ id: objectIdSchema });

export const listTripsQuery = z.object({ ...paginationQuery });
