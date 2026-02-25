"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3 = void 0;
exports.presignPut = presignPut;
exports.presignGet = presignGet;
exports.deleteObject = deleteObject;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const bucket = process.env.S3_BUCKET || "";
const region = process.env.S3_REGION || "us-east-1";
const endpoint = process.env.S3_ENDPOINT || undefined;
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";
exports.s3 = new client_s3_1.S3Client({
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
    if (!bucket)
        throw new Error("S3_BUCKET is required");
    return bucket;
}
async function presignPut(key, contentType) {
    const cmd = new client_s3_1.PutObjectCommand({
        Bucket: requireBucket(),
        Key: key,
        ContentType: contentType || undefined,
    });
    return (0, s3_request_presigner_1.getSignedUrl)(exports.s3, cmd, { expiresIn: 900 });
}
async function presignGet(key) {
    const cmd = new client_s3_1.GetObjectCommand({
        Bucket: requireBucket(),
        Key: key,
    });
    return (0, s3_request_presigner_1.getSignedUrl)(exports.s3, cmd, { expiresIn: 900 });
}
async function deleteObject(key) {
    const cmd = new client_s3_1.DeleteObjectCommand({
        Bucket: requireBucket(),
        Key: key,
    });
    await exports.s3.send(cmd);
}
//# sourceMappingURL=s3.js.map