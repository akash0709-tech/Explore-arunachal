// Validates req.body, req.query and req.params with Zod schemas.
//
// Usage in a route file:
//   router.post("/", validate({ body: createTripSchema }), tripController.create);
//   router.get("/:id", validate({ params: idParamSchema }), tripController.getOne);
//
// On success the parsed (cleaned, type-converted) values replace the originals,
// so controllers only ever see valid data. On failure the ZodError goes to the
// errorHandler, which returns a 400 with a list of field errors.
import { ZodError } from "zod";

export const validate = (schemas) => (req, _res, next) => {
  try {
    const issues = [];

    for (const key of ["params", "query", "body"]) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key] ?? {});
      if (result.success) {
        req[key] = result.data;
      } else {
        // Prefix the field path with where it came from, e.g. "body.email"
        result.error.issues.forEach((issue) => issues.push({ ...issue, path: [key, ...issue.path] }));
      }
    }

    if (issues.length > 0) return next(new ZodError(issues));
    return next();
  } catch (err) {
    return next(err);
  }
};
