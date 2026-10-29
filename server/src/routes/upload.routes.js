// Routes mounted at /api/uploads. Everything needs a logged-in user.
// Order matters: the file is parsed (upload middleware) BEFORE the body is validated,
// because multipart form fields only exist after multer has read the request.
import { Router } from "express";
import * as uploadController from "../controllers/upload.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import { uploadPhotos, uploadDocument, uploadCover } from "../middleware/upload.js";
import {
  homestayParams,
  photoParams,
  slotParams,
  destinationCoverParams,
  photosBody,
  reorderBody,
  documentBody
} from "../validators/upload.validator.js";

const router = Router();
router.use(requireAuth);

const host = requireRole("host");
const admin = requireRole("admin");

// ----- Host: homestay photos (public) -----
router.post(
  "/homestays/:id/photos",
  host,
  validate({ params: homestayParams }),
  uploadPhotos,
  validate({ body: photosBody }),
  uploadController.addPhotos
);
router.patch(
  "/homestays/:id/photos/order",
  host,
  validate({ params: homestayParams, body: reorderBody }),
  uploadController.reorderPhotos
);
router.delete(
  "/homestays/:id/photos/:fileId",
  host,
  validate({ params: photoParams }),
  uploadController.deletePhoto
);

// ----- Host: verification documents (private) -----
router.post(
  "/homestays/:id/documents",
  host,
  validate({ params: homestayParams }),
  uploadDocument,
  validate({ body: documentBody }),
  uploadController.uploadDocument
);
router.delete(
  "/homestays/:id/documents/:slot",
  host,
  validate({ params: slotParams }),
  uploadController.deleteDocument
);

// ----- Admin -----
router.get(
  "/admin/homestays/:id/documents/:slot/view",
  admin,
  validate({ params: slotParams }),
  uploadController.viewDocument
);
router.post(
  "/destinations/:slug/cover",
  admin,
  validate({ params: destinationCoverParams }),
  uploadCover,
  uploadController.setDestinationCover
);

export default router;
