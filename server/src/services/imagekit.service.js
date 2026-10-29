// Small wrapper around the ImageKit SDK. Everything else in the app calls these
// functions, so ImageKit details (and its errors) are handled in one place.
import { imagekit } from "../config/imagekit.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

export const SIGNED_URL_SECONDS = 300; // 5 minutes

// ImageKit errors become a clear 502 ("the image service failed"), never a stack trace
function imagekitError(action, err) {
  logger.error(`ImageKit ${action} failed: ${err?.message ?? err}`);
  return new ApiError(502, `File ${action} failed. Please try again in a moment.`);
}

/** Public photo (homestay or destination). Returns { url, fileId }. */
export async function uploadPublicImage(buffer, fileName, folder) {
  try {
    const result = await imagekit.upload({
      file: buffer,
      fileName,
      folder,
      useUniqueFileName: true,
      isPrivateFile: false
    });
    return { url: result.url, fileId: result.fileId };
  } catch (err) {
    throw imagekitError("upload", err);
  }
}

/**
 * PRIVATE verification document. Returns only { fileId, fileName }.
 * Private files cannot be opened with their normal URL; admins get a short-lived
 * signed URL from getSignedUrl(). We never store or return a public URL.
 */
export async function uploadPrivateDocument(buffer, fileName, folder) {
  try {
    const result = await imagekit.upload({
      file: buffer,
      fileName,
      folder,
      useUniqueFileName: true,
      isPrivateFile: true
    });
    return { fileId: result.fileId, fileName: result.name };
  } catch (err) {
    throw imagekitError("upload", err);
  }
}

/**
 * Signed URL that works for expireSeconds (default 5 minutes). Admins only.
 * Accepts a fileId (we look up its path) or a path starting with "/".
 */
export async function getSignedUrl(fileIdOrPath, expireSeconds = SIGNED_URL_SECONDS) {
  try {
    const path = fileIdOrPath.startsWith("/")
      ? fileIdOrPath
      : (await imagekit.getFileDetails(fileIdOrPath)).filePath;
    return imagekit.url({ path, signed: true, expireSeconds });
  } catch (err) {
    throw imagekitError("access", err);
  }
}

/** Deletes a file. A file that is already gone counts as success. */
export async function deleteFile(fileId) {
  try {
    await imagekit.deleteFile(fileId);
  } catch (err) {
    if (err?.$ResponseMetadata?.statusCode === 404 || /not.?found|does not exist/i.test(err?.message ?? "")) {
      logger.warn(`ImageKit file ${fileId} was already deleted`);
      return;
    }
    throw imagekitError("delete", err);
  }
}

/** Best-effort delete used for clean-up: logs instead of throwing. */
export async function deleteFileQuietly(fileId) {
  try {
    await deleteFile(fileId);
  } catch {
    logger.warn(`Could not clean up ImageKit file ${fileId}; delete it from the ImageKit dashboard`);
  }
}

/** Resized version of a public image URL for thumbnails, e.g. photo.jpg?tr=w-600,q-75 */
export function getTransformedUrl(url, { width = 600, quality = 75 } = {}) {
  return imagekit.url({ src: url, transformation: [{ width: String(width), quality: String(quality) }] });
}
