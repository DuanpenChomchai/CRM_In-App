import { S3Client } from "@aws-sdk/client-s3";

const endpointHost = process.env.MINIO_ENDPOINT || "localhost";
const endpointPort = process.env.MINIO_PORT || "9000";

// ถ้าไม่ได้ใส่ http(s):// ให้เติมให้
const endpoint =
  endpointHost.startsWith("http://") || endpointHost.startsWith("https://")
    ? endpointHost
    : `http://${endpointHost}:${endpointPort}`;

export const BUCKET_NAME = process.env.MINIO_BUCKET || "crminapp";

const s3Client = new S3Client({
  region: "us-east-1",
  endpoint,
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER!,
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD!,
  },
  forcePathStyle: true,
});

export default s3Client;
