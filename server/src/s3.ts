import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.S3_BUCKET || "";
const region = process.env.S3_REGION || "us-east-1";
const endpoint = process.env.S3_ENDPOINT || undefined;
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

export const s3 = new S3Client({
  region,
  endpoint,
  forcePathStyle,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
});

function requireBucket() {
  if (!bucket) throw new Error("S3_BUCKET is required");
  return bucket;
}

export async function presignPut(key: string, contentType?: string | null) {
  const cmd = new PutObjectCommand({
    Bucket: requireBucket(),
    Key: key,
    ContentType: contentType || undefined,
  });
  return getSignedUrl(s3, cmd, { expiresIn: 900 });
}

export async function presignGet(key: string) {
  const cmd = new GetObjectCommand({
    Bucket: requireBucket(),
    Key: key,
  });
  return getSignedUrl(s3, cmd, { expiresIn: 900 });
}

export async function deleteObject(key: string) {
  const cmd = new DeleteObjectCommand({
    Bucket: requireBucket(),
    Key: key,
  });
  await s3.send(cmd);
}
