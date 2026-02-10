import { Request, Response } from "express";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as presign } from "@aws-sdk/s3-request-presigner";
import s3Client, { BUCKET_NAME } from "../config/minioclient";
import { pipeline } from "stream/promises";

/** decode key ให้ปลอดภัย */
function readKey(req: Request) {
  const raw = String(req.query.key ?? "").trim();
  if (!raw) return "";
  try {
    // บางที key ถูก encode มาแล้ว (มี %2F)
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * GET /api/files/object?key=<minioKey>
 * stream object from minio
 */
export const getFileObject = async (req: Request, res: Response) => {
  const key = readKey(req);
  if (!key) return res.status(400).json({ message: "key is required" });

  const bucket = BUCKET_NAME;
  if (!bucket) return res.status(500).json({ message: "MINIO_BUCKET is not set" });

  try {
    console.log("[getFileObject] bucket:", bucket, "key:", key);

    const data = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    // headers
    const contentType = data.ContentType || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    // ให้แสดง inline เป็นค่า default (รูปจะ render ได้)
    // ถ้าอยากให้ไฟล์ดาวน์โหลดค่อยเปลี่ยนเป็น attachment
    res.setHeader("Content-Disposition", "inline");

    // cache: ถ้าต้องการให้มันเปลี่ยนได้ไว ให้ลด max-age
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");

    // stream
    const body = data.Body as any;
    if (!body) return res.status(404).json({ message: "file not found" });

    await pipeline(body, res);
  } catch (err: any) {
    const name = err?.name;
    const code = err?.Code || err?.code;

    console.error("[getFileObject] error:", { name, code, message: err?.message });

    // NoSuchKey / NotFound -> 404
    if (name === "NoSuchKey" || code === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ message: "file not found" });
    }

    return res.status(500).json({ message: "get file failed" });
  }
};

/**
 * GET /api/files/signed?key=<minioKey>
 * return: { url }  // presigned url จริง
 */
export const getSignedUrl = async (req: Request, res: Response) => {
  const key = readKey(req);
  if (!key) return res.status(400).json({ message: "key is required" });

  const bucket = BUCKET_NAME;
  if (!bucket) return res.status(500).json({ message: "MINIO_BUCKET is not set" });

  try {
    // อายุลิงก์ (วินาที)
    const expiresIn = Number(process.env.SIGNED_URL_EXPIRES || 60 * 10); // default 10 นาที

    console.log("[getSignedUrl] bucket:", bucket, "key:", key, "expiresIn:", expiresIn);

    const cmd = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      // ถ้าอยากบังคับให้เปิดแบบ inline เสมอ
      ResponseContentDisposition: "inline",
    });

    const url = await presign(s3Client as any, cmd as any, { expiresIn });

    return res.json({ url });
  } catch (err: any) {
    const name = err?.name;
    const code = err?.Code || err?.code;

    console.error("[getSignedUrl] error:", { name, code, message: err?.message });

    if (name === "NoSuchKey" || code === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ message: "file not found" });
    }

    return res.status(500).json({ message: "error generating signed url" });
  }
};
