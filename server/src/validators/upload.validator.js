// Zod schemas for /api/uploads. Multipart forms send every field as text.
import { z } from "zod";
import { DOCUMENT_SLOTS } from "../utils/constants.js";
import { objectIdSchema, slugSchema } from "./common.validator.js";

export const homestayParams = z.object({ id: objectIdSchema });

export const photoParams = z.object({
  id: objectIdSchema,
  fileId: z.string().trim().min(1).max(100)
});

export const slotParams = z.object({
  id: objectIdSchema,
  slot: z.enum(DOCUMENT_SLOTS, { message: "slot must be certificate, proof or id" })
});

export const destinationCoverParams = z.object({ slug: slugSchema });

// POST photos: optional labels, one per file ("labels" can be sent once per photo)
export const photosBody = z.object({
  labels: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => (value === undefined ? [] : [].concat(value)))
    .pipe(z.array(z.string().trim().max(40, "Labels must be at most 40 characters")))
});

// PATCH photos/order: the photo fileIds in their new order; the first one is the cover
export const reorderBody = z.object({
  fileIds: z.array(z.string().trim().min(1)).min(1, "fileIds is required")
});

// POST documents
export const documentBody = z
  .object({
    slot: z.enum(DOCUMENT_SLOTS, { message: "slot must be certificate, proof or id" }),
    proofType: z.string().trim().max(60).optional(), // e.g. "Electricity bill"
    idType: z.string().trim().max(60).optional() //      e.g. "Aadhaar"
  })
  .superRefine((body, ctx) => {
    if (body.slot === "proof" && !body.proofType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["proofType"],
        message: "Say what kind of proof this is"
      });
    }
    if (body.slot === "id" && !body.idType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["idType"], message: "Say what kind of ID this is" });
    }
  });
