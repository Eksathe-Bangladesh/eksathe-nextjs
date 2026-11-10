import "server-only";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type StorageConfiguration = { client: S3Client; bucket: string };
let cached: StorageConfiguration | null | undefined;

function storageConfiguration(): StorageConfiguration | null {
  if (cached !== undefined) return cached;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) {
    cached = null;
    return null;
  }
  const endpoint = process.env.S3_ENDPOINT;
  cached = {
    bucket,
    client: new S3Client({
      region: process.env.S3_REGION || "auto",
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
  return cached;
}

export function isObjectStorageConfigured() {
  return storageConfiguration() !== null;
}

export async function createUploadUrl(key: string, contentType: string, contentLength: number) {
  const storage = storageConfiguration();
  if (!storage) return null;
  const command = new PutObjectCommand({
    Bucket: storage.bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  const url = await getSignedUrl(storage.client, command, { expiresIn: 300 });
  return { url, expiresIn: 300 };
}

export async function createDownloadUrl(key: string, expiresIn = 60) {
  const storage = storageConfiguration();
  if (!storage) return null;
  return getSignedUrl(storage.client, new GetObjectCommand({ Bucket: storage.bucket, Key: key }), {
    expiresIn,
  });
}

export async function validateStoredObject(
  key: string,
  contentType: string,
  maxBytes: number,
  expectedBytes?: number,
) {
  const storage = storageConfiguration();
  if (!storage) throw new Error("Object storage is not configured.");
  const head = await storage.client.send(
    new HeadObjectCommand({ Bucket: storage.bucket, Key: key }),
  );
  const size = head.ContentLength;
  if (
    !size ||
    size <= 0 ||
    size > maxBytes ||
    (expectedBytes !== undefined && size !== expectedBytes)
  ) {
    throw new Error("Uploaded file size is invalid.");
  }
  if (head.ContentType?.split(";")[0].trim().toLowerCase() !== contentType.toLowerCase()) {
    throw new Error("Uploaded content type does not match.");
  }

  const response = await storage.client.send(
    new GetObjectCommand({ Bucket: storage.bucket, Key: key, Range: "bytes=0-15" }),
  );
  if (!response.Body) throw new Error("Uploaded file could not be read.");
  const bytes = await response.Body.transformToByteArray();
  if (!matchesMagicBytes(bytes, contentType))
    throw new Error("Uploaded file contents do not match the declared type.");
  return { sizeBytes: size, contentType };
}

function matchesMagicBytes(bytes: Uint8Array, contentType: string) {
  if (contentType === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png")
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value,
    );
  if (contentType === "image/webp")
    return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP";
  if (contentType === "application/pdf") return ascii(bytes, 0, 5) === "%PDF-";
  return false;
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return Array.from(bytes.slice(start, start + length), (byte) => String.fromCharCode(byte)).join(
    "",
  );
}
