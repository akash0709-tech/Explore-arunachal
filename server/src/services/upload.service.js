// Homestay photos, verification documents and destination covers.
//
// Golden rule: ImageKit and MongoDB must agree. If we upload to ImageKit and then
// saving to MongoDB fails, we delete the uploaded file again (no orphan files).
import { Homestay, Destination } from "../models/index.js";
import { homestayPhotosFolder, homestayDocsFolder, destinationFolder } from "../config/imagekit.js";
import { ApiError } from "../utils/ApiError.js";
import { HOMESTAY_EDITABLE_STATUS, MAX_HOMESTAY_PHOTOS } from "../utils/constants.js";
import {
  uploadPublicImage,
  uploadPrivateDocument,
  getSignedUrl,
  deleteFile,
  deleteFileQuietly,
  SIGNED_URL_SECONDS
} from "./imagekit.service.js";

// Keep a readable, safe version of the original name (no paths or odd characters)
const safeName = (original, ext) => {
  const base = (original ?? "file")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .slice(0, 60);
  return `${base || "file"}.${ext}`;
};

// Loads a homestay the current host owns and may still edit
async function findEditableHomestay(userId, homestayId, { withDocuments = false } = {}) {
  const query = Homestay.findById(homestayId);
  if (withDocuments) query.select("+documents");
  const homestay = await query;

  if (!homestay) throw ApiError.notFound("Homestay not found");
  if (String(homestay.hostId) !== String(userId))
    throw ApiError.forbidden("This homestay belongs to another host");
  if (!HOMESTAY_EDITABLE_STATUS.includes(homestay.status)) {
    throw ApiError.conflict(`Photos and documents cannot be changed while the listing is ${homestay.status}`);
  }
  return homestay;
}

// ----- Photos -----

export async function addPhotos(userId, homestayId, files, labels = []) {
  const homestay = await findEditableHomestay(userId, homestayId);
  const free = MAX_HOMESTAY_PHOTOS - homestay.photos.length;
  if (files.length > free) {
    throw ApiError.badRequest(`A homestay can have ${MAX_HOMESTAY_PHOTOS} photos. You can add ${free} more.`);
  }

  // 1. Upload all files to ImageKit in parallel; if any fails, remove the ones that worked
  const folder = homestayPhotosFolder(homestay._id);
  const results = await Promise.allSettled(
    files.map((file) => uploadPublicImage(file.buffer, safeName(file.originalname, file.detectedExt), folder))
  );
  const uploaded = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  const failed = results.find((r) => r.status === "rejected");
  if (failed) {
    await Promise.all(uploaded.map((u) => deleteFileQuietly(u.fileId)));
    throw failed.reason;
  }

  // 2. Save to MongoDB in ONE atomic update that also re-checks the 10-photo limit,
  //    so two uploads at the same moment cannot go over it
  const startOrder = homestay.photos.length;
  const newPhotos = uploaded.map((u, i) => ({
    url: u.url,
    fileId: u.fileId,
    label: labels[i] || undefined,
    order: startOrder + i
  }));

  try {
    const result = await Homestay.updateOne(
      {
        _id: homestay._id,
        status: { $in: HOMESTAY_EDITABLE_STATUS },
        $expr: { $lte: [{ $add: [{ $size: "$photos" }, newPhotos.length] }, MAX_HOMESTAY_PHOTOS] }
      },
      { $push: { photos: { $each: newPhotos } } }
    );
    if (result.modifiedCount === 0) {
      throw ApiError.conflict("The listing changed while uploading. Please refresh and try again.");
    }
  } catch (err) {
    // 3. No orphans: the database did not take the photos, so remove them from ImageKit
    await Promise.all(uploaded.map((u) => deleteFileQuietly(u.fileId)));
    throw err;
  }

  return (await Homestay.findById(homestay._id).select("photos").lean()).photos;
}

// The first photo in the new order becomes the cover
export async function reorderPhotos(userId, homestayId, fileIds) {
  const homestay = await findEditableHomestay(userId, homestayId);
  const current = homestay.photos.map((p) => p.fileId);

  const samePhotos = fileIds.length === current.length && current.every((id) => fileIds.includes(id));
  if (!samePhotos) {
    throw ApiError.badRequest("fileIds must list every current photo exactly once");
  }

  const byFileId = new Map(homestay.photos.map((p) => [p.fileId, p]));
  homestay.photos = fileIds.map((fileId, index) => {
    const photo = byFileId.get(fileId);
    photo.order = index;
    return photo;
  });
  await homestay.save();
  return homestay.photos;
}

export async function deletePhoto(userId, homestayId, fileId) {
  const homestay = await findEditableHomestay(userId, homestayId);
  if (!homestay.photos.some((p) => p.fileId === fileId)) throw ApiError.notFound("Photo not found");

  // ImageKit first: if it fails, nothing changes and the host can simply retry
  await deleteFile(fileId);

  homestay.photos = homestay.photos
    .filter((p) => p.fileId !== fileId)
    .map((p, index) => Object.assign(p, { order: index })); // close the gap in the order
  await homestay.save();
  return homestay.photos;
}

// ----- Verification documents (private) -----

// Returns the host's view of their documents: never a URL, only names and dates
const documentSummary = (docs) =>
  docs.map(({ slot, proofType, idType, fileName, uploadedAt }) => ({
    slot,
    proofType,
    idType,
    fileName,
    uploadedAt
  }));

export async function uploadDocument(userId, homestayId, file, { slot, proofType, idType }) {
  const homestay = await findEditableHomestay(userId, homestayId, { withDocuments: true });
  const previous = homestay.documents.find((d) => d.slot === slot);

  const uploaded = await uploadPrivateDocument(
    file.buffer,
    safeName(file.originalname, file.detectedExt),
    homestayDocsFolder(homestay._id)
  );

  try {
    // One file per slot: the new one replaces the old one
    homestay.documents = homestay.documents.filter((d) => d.slot !== slot);
    homestay.documents.push({
      slot,
      proofType: slot === "proof" ? proofType : undefined,
      idType: slot === "id" ? idType : undefined,
      fileId: uploaded.fileId,
      fileName: uploaded.fileName,
      uploadedAt: new Date()
    });
    await homestay.save();
  } catch (err) {
    await deleteFileQuietly(uploaded.fileId); // no orphans
    throw err;
  }

  // Only after the new file is safely saved, remove the replaced one
  if (previous) await deleteFileQuietly(previous.fileId);
  return documentSummary(homestay.documents);
}

export async function deleteDocument(userId, homestayId, slot) {
  const homestay = await findEditableHomestay(userId, homestayId, { withDocuments: true });
  const document = homestay.documents.find((d) => d.slot === slot);
  if (!document) throw ApiError.notFound(`No document in the "${slot}" slot`);

  await deleteFile(document.fileId);
  homestay.documents = homestay.documents.filter((d) => d.slot !== slot);
  await homestay.save();
  return documentSummary(homestay.documents);
}

// Admin only: a signed link that stops working after 5 minutes
export async function getDocumentViewUrl(homestayId, slot) {
  const homestay = await Homestay.findById(homestayId).select("+documents name").lean();
  if (!homestay) throw ApiError.notFound("Homestay not found");
  const document = homestay.documents.find((d) => d.slot === slot);
  if (!document) throw ApiError.notFound(`No document in the "${slot}" slot`);

  const url = await getSignedUrl(document.fileId, SIGNED_URL_SECONDS);
  return {
    url,
    expiresAt: new Date(Date.now() + SIGNED_URL_SECONDS * 1000),
    slot,
    fileName: document.fileName,
    proofType: document.proofType,
    idType: document.idType
  };
}

// ----- Destination cover (admin) -----

export async function setDestinationCover(slug, file) {
  const destination = await Destination.findOne({ slug });
  if (!destination) throw ApiError.notFound(`No destination found for "${slug}"`);
  const previous = destination.coverImage;

  const uploaded = await uploadPublicImage(
    file.buffer,
    `${slug}-cover.${file.detectedExt}`,
    destinationFolder(slug)
  );
  try {
    destination.coverImage = uploaded;
    await destination.save();
  } catch (err) {
    await deleteFileQuietly(uploaded.fileId);
    throw err;
  }

  if (previous?.fileId) await deleteFileQuietly(previous.fileId);
  return destination.coverImage;
}
