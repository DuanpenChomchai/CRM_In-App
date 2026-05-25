import { Request, Response } from "express";
import crypto from "crypto";
import path from "path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client, { BUCKET_NAME } from "../config/minioclient";

/**
 * POST /api/chat/upload
 * multipart/form-data: file
 * return: { fileKey, fileName, mimeType, size }
 */
export const uploadChatFile = async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ message: "file is required" });

    const bucket = BUCKET_NAME;
    if (!bucket) {
      return res.status(500).json({ message: "MINIO_BUCKET is not set" });
    }

    // ป้องกันชื่อไฟล์แปลก ๆ (optional) และแก้ปัญหาภาษาไทยจาก multer (latin1 -> utf8)
    let originalName = file.originalname || "file";
    try {
      originalName = Buffer.from(originalName, "latin1").toString("utf8");
    } catch (e) {
      // ignore
    }
    
    // หาก frontend ส่ง `originalname` ผ่าน body มาให้ใช้แทน (กันเหนียว)
    if (req.body.originalname) {
      try {
        originalName = decodeURIComponent(req.body.originalname);
      } catch (e) {
        originalName = req.body.originalname;
      }
    }

    const ext = path.extname(originalName);
    const random = crypto.randomBytes(16).toString("hex");

    // เก็บเป็น path ใน bucket (แยกโฟลเดอร์ chat/)
    const fileKey = `chat/${Date.now()}-${random}${ext}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype || "application/octet-stream",
        // ถ้าอยากให้เปิดดูใน browser/app ได้แบบ inline ไม่บังคับโหลด
        ContentDisposition: "inline",
      })
    );

    console.log("[UPLOAD] OK fileKey=", fileKey, "name=", originalName, "size=", file.size);

    return res.json({
      fileKey,
      fileName: originalName,
      mimeType: file.mimetype || "application/octet-stream",
      size: file.size,
    });
  } catch (err) {
    console.error("uploadChatFile error:", err);
    return res.status(500).json({ message: "upload failed" });
  }
};
