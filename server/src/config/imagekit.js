// ImageKit client. The private key stays on the server; files go
// browser -> our API -> ImageKit, and MongoDB stores only url / fileId.
import ImageKit from "imagekit";
import { env } from "./env.js";

export const imagekit = new ImageKit({
  publicKey: env.imagekit.publicKey,
  privateKey: env.imagekit.privateKey,
  urlEndpoint: env.imagekit.urlEndpoint
});

// Folder layout on ImageKit
export const IMAGEKIT_ROOT = "/explore-arunachal";
export const homestayPhotosFolder = (homestayId) => `${IMAGEKIT_ROOT}/homestays/${homestayId}/photos`;
export const homestayDocsFolder = (homestayId) => `${IMAGEKIT_ROOT}/homestays/${homestayId}/docs`;
export const destinationFolder = (slug) => `${IMAGEKIT_ROOT}/destinations/${slug}`;
