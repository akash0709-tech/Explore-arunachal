// Thin controllers for /api/uploads
import * as uploadService from "../services/upload.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";

// POST /api/uploads/homestays/:id/photos
export const addPhotos = asyncHandler(async (req, res) => {
  const photos = await uploadService.addPhotos(req.user.id, req.params.id, req.files, req.body.labels);
  sendSuccess(res, { statusCode: 201, data: { photos }, message: `${req.files.length} photo(s) uploaded` });
});

// PATCH /api/uploads/homestays/:id/photos/order
export const reorderPhotos = asyncHandler(async (req, res) => {
  const photos = await uploadService.reorderPhotos(req.user.id, req.params.id, req.body.fileIds);
  sendSuccess(res, { data: { photos }, message: "Photo order saved" });
});

// DELETE /api/uploads/homestays/:id/photos/:fileId
export const deletePhoto = asyncHandler(async (req, res) => {
  const photos = await uploadService.deletePhoto(req.user.id, req.params.id, req.params.fileId);
  sendSuccess(res, { data: { photos }, message: "Photo deleted" });
});

// POST /api/uploads/homestays/:id/documents
export const uploadDocument = asyncHandler(async (req, res) => {
  const documents = await uploadService.uploadDocument(req.user.id, req.params.id, req.file, req.body);
  sendSuccess(res, { statusCode: 201, data: { documents }, message: "Document uploaded" });
});

// DELETE /api/uploads/homestays/:id/documents/:slot
export const deleteDocument = asyncHandler(async (req, res) => {
  const documents = await uploadService.deleteDocument(req.user.id, req.params.id, req.params.slot);
  sendSuccess(res, { data: { documents }, message: "Document deleted" });
});

// GET /api/uploads/admin/homestays/:id/documents/:slot/view
export const viewDocument = asyncHandler(async (req, res) => {
  const data = await uploadService.getDocumentViewUrl(req.params.id, req.params.slot);
  sendSuccess(res, { data, message: "Link valid for 5 minutes" });
});

// POST /api/uploads/destinations/:slug/cover
export const setDestinationCover = asyncHandler(async (req, res) => {
  const coverImage = await uploadService.setDestinationCover(req.params.slug, req.file);
  sendSuccess(res, { data: { coverImage }, message: "Cover image updated" });
});
