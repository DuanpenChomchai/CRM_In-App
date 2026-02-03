import { Request, Response } from "express";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import s3Client, { BUCKET_NAME } from "../config/minioclient";

export const getFileObject = async (req: Request, res: Response) => {
  try {
    const key = String(req.query.key || "");
    if (!key) return res.status(400).json({ message: "key is required" });

    const bucket = BUCKET_NAME;
    if (!bucket) return res.status(500).json({ message: "MINIO_BUCKET is not set" });

    const data = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    // ตั้ง header ให้ browser/app แสดงรูป/ไฟล์ได้
    if (data.ContentType) res.setHeader("Content-Type", data.ContentType);
    res.setHeader("Cache-Control", "public, max-age=31536000");

    // stream กลับ
    const stream = data.Body as any;
    stream.pipe(res);
  } catch (err: any) {
    console.error("getFileObject error:", err?.name, err?.message);
    return res.status(404).json({ message: "file not found" });
  }
};
