import crypto from "node:crypto";

// AES-256-GCM encryption for integration credentials at rest. The key is
// derived from CREDENTIALS_SECRET so rotating the secret invalidates old blobs
// (they'll fail to decrypt and the integration will need re-auth).

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.CREDENTIALS_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "CREDENTIALS_SECRET is not set (or too short). Set a 32+ char random string.",
    );
  }
  // Normalise any-length secret into a 32-byte key.
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptJSON(value: unknown): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv.encrypted.tag, all base64url
  return [
    iv.toString("base64url"),
    encrypted.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

export function decryptJSON<T = Record<string, unknown>>(
  blob: string | null | undefined,
): T | null {
  if (!blob) return null;
  try {
    const key = getKey();
    const [ivB64, dataB64, tagB64] = blob.split(".");
    if (!ivB64 || !dataB64 || !tagB64) return null;
    const iv = Buffer.from(ivB64, "base64url");
    const data = Buffer.from(dataB64, "base64url");
    const tag = Buffer.from(tagB64, "base64url");
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8")) as T;
  } catch {
    return null;
  }
}

// Mask a secret for display: keep the last 4 chars.
export function maskSecret(value: string | undefined | null): string {
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return "••••••••" + value.slice(-4);
}
