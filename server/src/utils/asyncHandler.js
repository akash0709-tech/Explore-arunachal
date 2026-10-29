// Wraps an async controller so any thrown error goes to the central errorHandler.
// Without it, every controller would need its own try/catch.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
