// An image stored on ImageKit. We keep only the public url and ImageKit's fileId
// (the fileId lets us delete or replace the file later).
import mongoose from "mongoose";

export const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    fileId: { type: String, required: true, trim: true }
  },
  { _id: false }
);

// A month number 1-12, used by bestMonths, openMonths and Trip.month
export const monthField = { type: Number, min: 1, max: 12 };
