import mongoose from "mongoose";
import crypto from "crypto";

/**
 * User — PRD `users` collection ka core. Auth + roles + rewards ka base.
 * password_hash `select:false` — kabhi galti se API response mein leak na ho.
 */
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password_hash: { type: String, select: false },

    role_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "Role" }],

    google_id: { type: String, index: true, sparse: true },

    is_email_verified: { type: Boolean, default: false },
    is_2fa_enabled: { type: Boolean, default: false },

    referral_code: { type: String, unique: true, index: true },
    reward_points: { type: Number, default: 0 },
    cumulative_session_count: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["active", "suspended", "banned"],
      default: "active",
    },
    last_login_at: { type: Date },
  },
  { timestamps: true }
);

// Har user ko ek unique referral code — registration pe auto-generate.
// (Mongoose 9: document pre-hooks ab promise/sync style hain — `next` callback nahi.)
UserSchema.pre("validate", function () {
  if (!this.referral_code) {
    this.referral_code = crypto.randomBytes(4).toString("hex").toUpperCase();
  }
});

export default mongoose.models.User || mongoose.model("User", UserSchema);
