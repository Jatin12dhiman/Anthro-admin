import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

/**
 * Anthroplanet — central S3 helper (admin-backend only).
 *
 * PRD/guide ke hisaab se:
 *  - Public files (profile photos, blog images) → `public/` prefix
 *  - Private files (submissions, guides, course material, certificates, CV,
 *    CT outputs) → `private/` prefix, **signed URL (1-hour expiry)** se hi access
 *  - Har upload pe **MIME type validate** + size limit (S3 pe daalne se pehle)
 *      • images  → max 10 MB
 *      • papers/documents → max 100 MB
 *
 * user-frontend (anthro-user) is file ko kabhi import nahi karta — sirf
 * admin-backend ke API routes use karte hain.
 */

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET;
const SIGNED_EXPIRY = Number(process.env.S3_SIGNED_URL_EXPIRY || 3600); // 1 hr
const MAX_IMAGE_BYTES = Number(process.env.S3_MAX_IMAGE_BYTES || 10 * 1024 * 1024); // 10 MB
const MAX_DOCUMENT_BYTES = Number(process.env.S3_MAX_DOCUMENT_BYTES || 100 * 1024 * 1024); // 100 MB

// Allowed MIME types per kind (S3 pe daalne se pehle yahi check hote hain).
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/csv",
];

/** Validation error jise route handler 400 ke saath return kar sake. */
export class FileValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "FileValidationError";
    this.status = 400;
  }
}

// Lazy singleton — har request pe naya client na bane.
let _client;
function client() {
  if (!_client) {
    if (!BUCKET) throw new Error("S3_BUCKET env missing");
    _client = new S3Client({
      region: REGION,
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined, // default credential chain
    });
  }
  return _client;
}

/**
 * MIME + size validate. `kind` = "image" | "document".
 * Galat type ya bada file → FileValidationError (400) throw.
 */
export function validateFile({ contentType, size, kind }) {
  if (kind === "image") {
    if (!IMAGE_TYPES.includes(contentType)) {
      throw new FileValidationError(
        `Unsupported image type "${contentType}". Allowed: JPEG, PNG, WebP, GIF.`
      );
    }
    if (size > MAX_IMAGE_BYTES) {
      throw new FileValidationError(
        `Image too large (${mb(size)} MB). Max allowed is ${mb(MAX_IMAGE_BYTES)} MB.`
      );
    }
  } else if (kind === "document") {
    if (!DOCUMENT_TYPES.includes(contentType)) {
      throw new FileValidationError(
        `Unsupported document type "${contentType}". Allowed: PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, CSV.`
      );
    }
    if (size > MAX_DOCUMENT_BYTES) {
      throw new FileValidationError(
        `Document too large (${mb(size)} MB). Max allowed is ${mb(MAX_DOCUMENT_BYTES)} MB.`
      );
    }
  } else {
    throw new FileValidationError(`Unknown file kind "${kind}".`);
  }
}

function mb(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

/** filename ko safe banata hai (path traversal / weird chars hata ke). */
function sanitize(name = "file") {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "file";
}

/** S3 key banata hai: `<visibility>/<folder>/<uuid>-<filename>`. */
function buildKey({ visibility, folder, filename }) {
  const seg = (s) => sanitize(s).replace(/\./g, "-"); // folder me dot na ho
  return `${visibility}/${seg(folder)}/${randomUUID()}-${sanitize(filename)}`;
}

/**
 * File ko S3 pe upload kare (validate karke).
 *
 * @param {Object} p
 * @param {Buffer|Uint8Array} p.buffer   file ka data
 * @param {string} p.contentType         MIME type
 * @param {number} p.size                bytes
 * @param {"image"|"document"} p.kind    validation kis tarah ki ho
 * @param {string} p.folder              logical folder (e.g. "blogs", "ct-orders", "cv")
 * @param {string} p.filename            original filename
 * @param {"public"|"private"} [p.visibility="private"]
 * @returns {{ key: string, visibility: string }}
 */
export async function uploadFile({
  buffer,
  contentType,
  size,
  kind,
  folder,
  filename,
  visibility = "private",
}) {
  validateFile({ contentType, size, kind });

  const key = buildKey({ visibility, folder, filename });
  await client().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return { key, visibility };
}

/**
 * Private file ke liye time-limited signed download URL (default 1 hr).
 * Guide: "private files (submissions, guides, course material, certificates,
 * CV, outputs) → signed URL, 1-hour expiry".
 */
export async function getDownloadUrl(key, expiresIn = SIGNED_EXPIRY) {
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
    expiresIn,
  });
}

/**
 * Public file ka direct URL (profile photos, blog images).
 * NOTE: ye tabhi khulega jab bucket/`public/` prefix pe public-read policy ho.
 */
export function getPublicUrl(key) {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

/** S3 se file delete kare (replace/remove ke liye). */
export async function deleteFile(key) {
  if (!key) return;
  await client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export const limits = {
  maxImageBytes: MAX_IMAGE_BYTES,
  maxDocumentBytes: MAX_DOCUMENT_BYTES,
  imageTypes: IMAGE_TYPES,
  documentTypes: DOCUMENT_TYPES,
};
