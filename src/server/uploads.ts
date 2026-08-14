import type { AttachmentKind, PaymentChannel } from "@prisma/client";
import { ValidationError } from "@/lib/errors";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export function requiredKindForChannel(channel: PaymentChannel): AttachmentKind {
  if (channel === "CREDIT_CARD") return "SLIP";
  if (channel === "CHECK") return "CHECK_PHOTO";
  return "RECEIPT";
}

export async function readUpload(formData: FormData, field = "file"): Promise<{
  filename: string;
  mimeType: string;
  bytes: Buffer;
} | null> {
  const file = formData.get(field);
  if (!file || !(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_BYTES) throw new ValidationError("Dosya en fazla 8 MB olabilir.");
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED.has(mimeType)) {
    throw new ValidationError("Yalnızca JPG, PNG, WEBP, GIF veya PDF yükleyin.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  return { filename: file.name || "belge", mimeType, bytes };
}

export async function requireUpload(formData: FormData, field = "file") {
  const upload = await readUpload(formData, field);
  if (!upload) throw new ValidationError("Belge (makbuz / slip / çek fotoğrafı) zorunludur.");
  return upload;
}
