import { json, preflight } from "@/lib/http";
import { requireAuth } from "@/lib/require-auth";
import { uploadFile, getPublicUrl, getDownloadUrl } from "@/lib/s3";

export async function OPTIONS(req) {
  return preflight(req);
}

export async function POST(req) {
  try {
    const { user, fail } = await requireAuth(req);
    if (fail) return fail;

    const formData = await req.formData();
    const file = formData.get("file");
    const kind = formData.get("kind") || "image"; // "image" | "document"
    const folder = formData.get("folder") || "blogs";
    const visibility = formData.get("visibility") || "public"; // "public" | "private"

    if (!file || typeof file === "string") {
      return json(req, { error: "No file provided in field 'file'" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Upload to S3
    const { key } = await uploadFile({
      buffer,
      contentType: file.type,
      size: file.size,
      kind,
      folder,
      filename: file.name,
      visibility,
    });

    const url = visibility === "public" ? getPublicUrl(key) : await getDownloadUrl(key);

    return json(req, {
      url,
      key,
      visibility,
      filename: file.name,
      contentType: file.type,
    });
  } catch (err) {
    if (err.name === "FileValidationError") {
      return json(req, { error: err.message }, { status: 400 });
    }
    console.error("Upload error:", err);
    return json(req, { error: "Failed to upload file to storage" }, { status: 500 });
  }
}
