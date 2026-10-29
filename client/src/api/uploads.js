// /api/uploads: files go browser -> our API -> ImageKit (multipart/form-data).
import { api, unwrap } from "./axios.js";

// Upload progress as a whole number 0-100
const progressHandler = (onProgress) =>
  onProgress
    ? (event) => event.total && onProgress(Math.round((event.loaded / event.total) * 100))
    : undefined;

/**
 * Up to 10 photos (JPG/PNG/WEBP, 5 MB each).
 * @param {string} homestayId
 * @param {File[]} files
 * @param {{ labels?: string[], onProgress?: (percent: number) => void }} [options]
 */
export function uploadPhotos(homestayId, files, { labels = [], onProgress } = {}) {
  const form = new FormData();
  files.forEach((file) => form.append("photos", file));
  labels.forEach((label) => form.append("labels", label));
  return api
    .post(`/uploads/homestays/${homestayId}/photos`, form, { onUploadProgress: progressHandler(onProgress) })
    .then((r) => unwrap(r).photos);
}

/**
 * New order of photos; the first one becomes the cover.
 * @param {string} homestayId
 * @param {string[]} fileIds
 */
export const reorderPhotos = (homestayId, fileIds) =>
  api.patch(`/uploads/homestays/${homestayId}/photos/order`, { fileIds }).then((r) => unwrap(r).photos);

/** @param {string} homestayId @param {string} fileId */
export const deletePhoto = (homestayId, fileId) =>
  api
    .delete(`/uploads/homestays/${homestayId}/photos/${encodeURIComponent(fileId)}`)
    .then((r) => unwrap(r).photos);

/**
 * Private verification document (PDF/JPG/PNG, 5 MB). Replaces any file in that slot.
 * @param {string} homestayId
 * @param {File} file
 * @param {{ slot: "certificate"|"proof"|"id", proofType?: string, idType?: string, onProgress?: (percent: number) => void }} options
 */
export function uploadDocument(homestayId, file, { slot, proofType, idType, onProgress }) {
  const form = new FormData();
  form.append("document", file);
  form.append("slot", slot);
  if (proofType) form.append("proofType", proofType);
  if (idType) form.append("idType", idType);
  return api
    .post(`/uploads/homestays/${homestayId}/documents`, form, {
      onUploadProgress: progressHandler(onProgress)
    })
    .then((r) => unwrap(r).documents);
}

/** @param {string} homestayId @param {"certificate"|"proof"|"id"} slot */
export const deleteDocument = (homestayId, slot) =>
  api.delete(`/uploads/homestays/${homestayId}/documents/${slot}`).then((r) => unwrap(r).documents);

/**
 * Admin only: a signed link to a private document, valid for 5 minutes.
 * @param {string} homestayId @param {"certificate"|"proof"|"id"} slot
 * @returns {Promise<{ url: string, expiresAt: string, fileName: string }>}
 */
export const getDocumentViewUrl = (homestayId, slot) =>
  api.get(`/uploads/admin/homestays/${homestayId}/documents/${slot}/view`).then(unwrap);

/**
 * Admin only: destination cover image.
 * @param {string} slug @param {File} file
 */
export function uploadDestinationCover(slug, file) {
  const form = new FormData();
  form.append("cover", file);
  return api.post(`/uploads/destinations/${slug}/cover`, form).then((r) => unwrap(r).coverImage);
}
