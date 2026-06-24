import mongoose from "mongoose";

/**
 * Role — RBAC ke liye. PRD: roles DYNAMIC hain (Super Admin naye bana sakta),
 * isliye permissions DB mein store hote hain, code mein hardcode nahi.
 * permissions = { module: [actions] }, e.g. { blog: ["read","create"] }.
 */
const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    permissions: { type: mongoose.Schema.Types.Mixed, default: {} },
    is_system_role: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Role || mongoose.model("Role", RoleSchema);
