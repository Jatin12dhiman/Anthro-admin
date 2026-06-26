import mongoose from "mongoose";

/**
 * Comment — PRD `comments` collection (SOW 3.2 "Reader Comments & Likes").
 * 2-level threading via parent_id (null = top-level).
 */
const CommentSchema = new mongoose.Schema(
  {
    blog_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blog",
      required: true,
      index: true,
    },
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    author: {
      name: { type: String, default: "" },
      avatar: { type: String, default: "" },
    },
    parent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    is_flagged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Comment || mongoose.model("Comment", CommentSchema);
