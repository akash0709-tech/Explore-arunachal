// Zod schemas for the public /api/stays endpoints
import { z } from "zod";
import { CONTACT_CHANNELS, REPORT_REASONS } from "../utils/constants.js";
import { objectIdSchema, paginationQuery } from "./common.validator.js";

// GET /api/stays?town=tawang&maxPrice=2500&minRooms=2&facilities=Wi-Fi,Meals&page=1
export const listStaysQuery = z.object({
  town: z.string().trim().toLowerCase().max(60).optional(), // slug ("tawang") or destination id
  maxPrice: z.coerce.number().positive().optional(),
  minRooms: z.coerce.number().int().min(1).optional(),
  facilities: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean)
        : []
    ),
  ...paginationQuery
});

export const stayIdParams = z.object({ id: objectIdSchema });

// POST /api/stays/:id/contact-tap
export const contactTapBody = z.object({
  channel: z.enum(CONTACT_CHANNELS, { message: "channel must be call or whatsapp" })
});

// POST /api/stays/:id/report
export const reportBody = z.object({
  reason: z.enum(REPORT_REASONS, {
    message: "reason must be wrong_price, wrong_location_or_photos, host_unreachable or safety"
  }),
  note: z.string().trim().max(1000).optional()
});
