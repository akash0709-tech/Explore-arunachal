// File uploads with multer. Files are kept in memory (never written to our disk)
// and then sent to ImageKit by the service.
//
// Two checks on every file:
//   1. multer: size limit, number of files, and a quick look at the declared type
//   2. file-type: reads the first bytes of the file to find its REAL type, so an
//      .exe renamed to photo.jpg is rejected
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { ApiError } from "../utils/ApiError.js";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PHOTOS_PER_UPLOAD = 10;

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const describe = (types) =>
  types
    .map((t) => (t === "application/pdf" ? "PDF" : t.split("/")[1].toUpperCase().replace("JPEG", "JPG")))
    .join(", ");

// Builds one upload middleware: multer + real-type check, with friendly error messages
function createUpload({ field, maxFiles, allowedTypes, label }) {
  const parser = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_BYTES, files: maxFiles },
    fileFilter: (_req, file, callback) => {
      if (allowedTypes.includes(file.mimetype)) return callback(null, true);
      return callback(
        ApiError.badRequest(`${file.originalname}: only ${describe(allowedTypes)} files are allowed`)
      );
    }
  });
  const run = maxFiles === 1 ? parser.single(field) : parser.array(field, maxFiles);

  return (req, res, next) => {
    run(req, res, async (err) => {
      if (err) return next(toFriendlyError(err, { field, maxFiles, label }));

      const files = req.file ? [req.file] : (req.files ?? []);
      if (files.length === 0)
        return next(ApiError.badRequest(`Please attach a ${label} in the "${field}" field`));

      try {
        for (const file of files) {
          const detected = await fileTypeFromBuffer(file.buffer);
          if (!detected || !allowedTypes.includes(detected.mime)) {
            return next(
              ApiError.badRequest(`${file.originalname} is not a real ${describe(allowedTypes)} file`)
            );
          }
          // Trust only the detected type from now on (used for the stored file name)
          file.detectedMime = detected.mime;
          file.detectedExt = detected.ext === "jpeg" ? "jpg" : detected.ext;
        }
        return next();
      } catch (checkErr) {
        return next(checkErr);
      }
    });
  };
}

function toFriendlyError(err, { field, maxFiles, label }) {
  if (err instanceof ApiError) return err;
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return ApiError.badRequest("Each file must be 5 MB or smaller");
    if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
      return ApiError.badRequest(
        maxFiles === 1
          ? `Upload one ${label} at a time, in the "${field}" field`
          : `Upload at most ${maxFiles} photos at a time, in the "${field}" field`
      );
    }
    return ApiError.badRequest(err.message);
  }
  return err;
}

// Homestay photos: JPG/PNG/WEBP, up to 10 per request, field "photos"
export const uploadPhotos = createUpload({
  field: "photos",
  maxFiles: MAX_PHOTOS_PER_UPLOAD,
  allowedTypes: PHOTO_TYPES,
  label: "photo"
});

// Verification document: PDF/JPG/PNG, one file, field "document"
export const uploadDocument = createUpload({
  field: "document",
  maxFiles: 1,
  allowedTypes: DOCUMENT_TYPES,
  label: "document"
});

// Destination cover image (admin): one photo, field "cover"
export const uploadCover = createUpload({
  field: "cover",
  maxFiles: 1,
  allowedTypes: PHOTO_TYPES,
  label: "cover image"
});
