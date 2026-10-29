// A person using the app: traveller, homestay host or admin (tourism review team).
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES, USER_STATUS } from "../utils/constants.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"]
    },
    // Optional (e.g. Google sign-up), but unique when present. See the partial index below.
    phone: { type: String, trim: true, match: [/^\d{10}$/, "Phone must be 10 digits"] },

    // Never selected by default: must be asked for with .select("+passwordHash")
    // Not required for users who signed in with Google
    passwordHash: {
      type: String,
      select: false,
      required: function () {
        return !this.googleId;
      }
    },
    googleId: { type: String },

    role: { type: String, enum: ROLES, default: "traveller" },
    status: { type: String, enum: USER_STATUS, default: "active" },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },

    // Hash of the current refresh token, so logout / "log out everywhere" can revoke it
    refreshTokenHash: { type: String, select: false },
    lastLoginAt: { type: Date }
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      // Secrets never leave the server, even if someone selects them by mistake
      transform: (_doc, ret) => {
        delete ret.passwordHash;
        delete ret.refreshTokenHash;
        return ret;
      }
    }
  }
);

// Unique only when the field exists, so many users can have no phone / no Google account
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: "string" } } });
userSchema.index(
  { googleId: 1 },
  { unique: true, partialFilterExpression: { googleId: { $type: "string" } } }
);
userSchema.index({ role: 1, status: 1 }); // admin lists such as "all suspended hosts"

// Check a plain password against the stored hash (the document must be loaded with +passwordHash)
userSchema.methods.comparePassword = function (plainPassword) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plainPassword, this.passwordHash);
};

export const User = mongoose.model("User", userSchema);
