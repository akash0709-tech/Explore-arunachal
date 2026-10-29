// A custom error we throw on purpose, e.g. throw ApiError.notFound("Trip not found").
// The central errorHandler turns it into { success: false, message, errors }.
export class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;
  }

  // Shortcuts for the most common cases
  static badRequest(message = "Bad request", errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = "Please log in to continue") {
    return new ApiError(401, message);
  }

  static forbidden(message = "You do not have permission to do this") {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  static conflict(message = "Resource already exists", errors = []) {
    return new ApiError(409, message, errors);
  }
}
