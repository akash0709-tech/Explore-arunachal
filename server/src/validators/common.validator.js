// Small Zod building blocks shared by several validators.
import { z } from "zod";

// Query strings are always text: "true" / "false" -> boolean
export const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");

// URL-friendly name such as "tawang" or "sela-pass"
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Invalid slug");

// A MongoDB id: 24 hexadecimal characters
export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Invalid id");

// ?page=1&limit=20 (pagination.js applies the final defaults and the maximum)
export const paginationQuery = {
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
};
