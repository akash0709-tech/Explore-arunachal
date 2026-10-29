// Zod schemas for /api/permits
import { z } from "zod";
import { CITIZENSHIP } from "../utils/constants.js";
import { slugSchema } from "./common.validator.js";

// GET /api/permits/check?citizen=indian&destinations=dirang,tawang
export const checkPermitsQuery = z.object({
  citizen: z.enum(CITIZENSHIP, { message: "citizen must be indian or foreign" }),
  destinations: z
    .string({ required_error: "destinations is required, e.g. destinations=dirang,tawang" })
    // "Dirang, tawang,,tawang" -> ["dirang", "tawang"]
    .transform((value) => [
      ...new Set(
        value
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      )
    ])
    .pipe(
      z.array(slugSchema).min(1, "Choose at least one destination").max(15, "Choose at most 15 destinations")
    )
});
