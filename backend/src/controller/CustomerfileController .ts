import { Response } from "express";
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import s3Client, { BUCKET_NAME } from "../config/minioclient";
import { randomUUID } from "crypto";
import prisma from "../config/prismaclient";
import { AuthRequest } from "../middlewares/authMiddleware";
import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

/**
 * POST /api/customers/:customerId/files
 * อัปโหลดไฟล์แนบทั่วไปของลูกค้า (ไม่เกี่ยวกับใบเสนอราคา)
 */
export const uploadCustomerFile = async (req: AuthRequest, res: Response) => {
  try {
    const customerId = Number(req.params.customerId);
    if (!Number.isInteger(customerId)) {
      return res.status(400).json({ message: "customerId ไม่ถูกต้อง" });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return res.status(404).json({ message: "ไม่พบลูกค้า" });

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ message: "ไม่พบไฟล์" });

    // ✅ decode originalname จาก latin1 → UTF-8 (รองรับภาษาไทย)
    let safeOriginalName = file.originalname;
    try {
      safeOriginalName = Buffer.from(file.originalname, "latin1").toString("utf8");
    } catch {
      safeOriginalName = file.originalname;
    }

    const ext = (safeOriginalName.split(".").pop() || "bin").toLowerCase();
    const key = `customers/${customerId}/files/${randomUUID()}.${ext}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME as string,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    const saved = await (prisma as any).customerFile.create({
      data: {
        customerId,
        fileName: safeOriginalName,
        fileKey: key,
        fileMime: file.mimetype,
        fileSize: file.size,
      },
    });

    return res.status(201).json(saved);
  } catch (err) {
    console.error("uploadCustomerFile error:", err);
    return res.status(500).json({ message: "อัปโหลดไฟล์ไม่สำเร็จ" });
  }
};

/**
 * GET /api/customers/:customerId/files/:fileId/download
 * ดาวน์โหลดไฟล์แนบทั่วไปของลูกค้า
 */
export const downloadCustomerFile = async (req: AuthRequest, res: Response) => {
  try {
    const fileId = Number(req.params.fileId);
    const file = await (prisma as any).customerFile.findUnique({ where: { id: fileId } });
    if (!file) return res.status(404).json({ message: "ไม่พบไฟล์" });

    const obj = await s3Client.send(
      new GetObjectCommand({ Bucket: BUCKET_NAME as string, Key: file.fileKey })
    );

    const encodedName = encodeURIComponent(file.fileName).replace(/'/g, "%27");
    res.setHeader("Content-Type", file.fileMime || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.fileName.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encodedName}`
    );
    (obj.Body as any).pipe(res);
  } catch (err) {
    console.error("downloadCustomerFile error:", err);
    return res.status(500).json({ message: "ดาวน์โหลดไฟล์ไม่สำเร็จ" });
  }
};

/**
 * DELETE /api/customers/:customerId/files/:fileId
 * ลบไฟล์แนบทั่วไปของลูกค้า
 */
export const deleteCustomerFile = async (req: AuthRequest, res: Response) => {
  try {
    const fileId = Number(req.params.fileId);
    const file = await (prisma as any).customerFile.findUnique({ where: { id: fileId } });
    if (!file) return res.status(404).json({ message: "ไม่พบไฟล์" });

    await s3Client.send(
      new DeleteObjectCommand({ Bucket: BUCKET_NAME as string, Key: file.fileKey })
    );
    await (prisma as any).customerFile.delete({ where: { id: fileId } });

    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteCustomerFile error:", err);
    return res.status(500).json({ message: "ลบไฟล์ไม่สำเร็จ" });
  }
};