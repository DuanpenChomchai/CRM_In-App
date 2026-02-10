import { S3Client } from "@aws-sdk/client-s3";

const rawEndpoint = process.env.MINIO_ENDPOINT || "localhost";
const useSSL = String(process.env.MINIO_USE_SSL || "false").toLowerCase() === "true";
const port = process.env.MINIO_PORT || "9000";

const endpoint = rawEndpoint.startsWith("http")
  ? rawEndpoint
  : `${useSSL ? "https" : "http"}://${rawEndpoint}:${port}`;

const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: "http://10.155.191.26:9000",
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER!,
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD!,
  },
  forcePathStyle: true,
});

export const BUCKET_NAME = process.env.MINIO_BUCKET;
export default s3Client;
