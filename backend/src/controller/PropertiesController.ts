import { Request, Response } from "express";
import { randomUUID } from "crypto";
import prisma from "../config/prismaclient";
import s3Client, { BUCKET_NAME } from "../config/minioclient";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { AuthRequest } from "../middlewares/authMiddleware";

const BUCKET = BUCKET_NAME as string;

const toNumber = (v: any) => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const mapType = (v: string) => {
  const t = String(v || "").toUpperCase();
  if (t === "HOUSE") return "HOUSE";
  if (t === "CONDO") return "CONDO";
  if (t === "TOWNHOME") return "TOWNHOME";
  if (v === "บ้านเดี่ยว") return "HOUSE";
  if (v === "คอนโด") return "CONDO";
  if (v === "ทาวน์เฮ้าส์") return "TOWNHOME";
  return "HOUSE";
};

const mapStatus = (v: string) => {
  const s = String(v || "").toUpperCase();
  if (s === "AVAILABLE") return "AVAILABLE";
  if (s === "RESERVED") return "RESERVED";
  if (s === "SOLD") return "SOLD";
  if (s === "available") return "AVAILABLE";
  if (s === "reserved") return "RESERVED";
  if (s === "sold") return "SOLD";
  return "AVAILABLE";
};

const makeImageKey = (propertyId: number, originalName: string) => {
  const ext = (originalName.split(".").pop() || "jpg").toLowerCase();
  return `properties/${propertyId}/${randomUUID()}.${ext}`;
};

/**
 * GET /api/properties
 */
export const listProperties = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page ?? "1"), 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt(String(req.query.pageSize ?? "12"), 10), 1),
      100
    );

    const q = String(req.query.q ?? "").trim();
    const type = String(req.query.type ?? "all");
    const status = String(req.query.status ?? "all");

    const where: any = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    if (type && type !== "all") where.type = mapType(type);
    if (status && status !== "all") where.status = mapStatus(status);

    const [items, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.property.count({ where }),
    ]);

    return res.json({
      data: items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("listProperties error:", err);
    return res.status(500).json({ message: "ดึงรายการอสังหาฯ ล้มเหลว" });
  }
};

/**
 * GET /api/properties/:id
 */
export const getPropertyById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const item = await prisma.property.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });

    if (!item) return res.status(404).json({ message: "ไม่พบอสังหาฯ" });
    return res.json(item);
  } catch (err) {
    console.error("getPropertyById error:", err);
    return res.status(500).json({ message: "ดึงข้อมูลอสังหาฯ ล้มเหลว" });
  }
};

/**
 * POST /api/properties (ADMIN)
 * - ตัวนี้ FE ส่งเป็น JSON (ไม่มีรูป) ถูกแล้ว
 * - รูปจะไปยิง POST /:id/image อีกที
 */
export const createProperty = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const body: any = req.body || {};

    const name = body.name;
    const type = body.type;
    const location = body.location;
    const address = body.address;
    const price = body.price;
    const bedrooms = body.bedrooms;
    const bathrooms = body.bathrooms;
    const size = body.size;
    const status = body.status;
    const description = body.description;

    if (!name || !location || price === undefined || price === null || price === "") {
      return res.status(400).json({ message: "กรุณากรอก name, location, price" });
    }

    const priceNum = toNumber(price);
    if (priceNum === undefined) return res.status(400).json({ message: "price ไม่ถูกต้อง" });

    const created = await prisma.property.create({
      data: {
        name: String(name).trim(),
        type: mapType(String(type || "HOUSE")) as any,
        location: String(location).trim(),
        address: address ? String(address).trim() : null,
        price: priceNum as any,
        bedrooms: Number(bedrooms ?? 0),
        bathrooms: Number(bathrooms ?? 0),
        size: Number(size ?? 0),
        status: mapStatus(String(status || "AVAILABLE")) as any,
        description: description ? String(description).trim() : null,
        img: null, // ✅ เก็บ key ทีหลังตอน upload รูป
        createdById: userId,
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error("createProperty error:", err);
    return res.status(500).json({ message: "สร้างอสังหาฯ ล้มเหลว" });
  }
};

/**
 * PATCH /api/properties/:id (ADMIN)
 * (ไม่อัปโหลดรูปในนี้แล้ว ให้ไป POST /:id/image)
 */
export const updateProperty = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const body: any = req.body || {};

    const data: any = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.type !== undefined) data.type = mapType(String(body.type)) as any;
    if (body.location !== undefined) data.location = String(body.location).trim();
    if (body.address !== undefined) data.address = body.address ? String(body.address).trim() : null;
    if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null;
    if (body.status !== undefined) data.status = mapStatus(String(body.status)) as any;

    if (body.price !== undefined) {
      const priceNum = toNumber(body.price);
      if (priceNum === undefined) return res.status(400).json({ message: "price ไม่ถูกต้อง" });
      data.price = priceNum as any;
    }

    if (body.bedrooms !== undefined) data.bedrooms = Number(body.bedrooms ?? 0);
    if (body.bathrooms !== undefined) data.bathrooms = Number(body.bathrooms ?? 0);
    if (body.size !== undefined) data.size = Number(body.size ?? 0);

    const updated = await prisma.property.update({ where: { id }, data });
    return res.json(updated);
  } catch (err: any) {
    console.error("updateProperty error:", err);
    if (err?.code === "P2025") return res.status(404).json({ message: "ไม่พบอสังหาฯ" });
    return res.status(500).json({ message: "แก้ไขอสังหาฯ ล้มเหลว" });
  }
};

/**
 * POST /api/properties/:id/image (ADMIN)
 * - รับไฟล์จาก multer field "img"
 * - อัปขึ้น MinIO
 * - อัปเดต property.img = key (ชื่อไฟล์/คีย์)
 */
export const uploadPropertyImage = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const file = (req as any).file as Express.Multer.File | undefined;

    if (!file) return res.status(400).json({ message: "กรุณาแนบไฟล์รูป (field: img)" });
    if (!BUCKET) return res.status(500).json({ message: "MINIO_BUCKET ไม่ถูกตั้งค่า" });

    // เช็คว่ามี property จริง
    const exists = await prisma.property.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ message: "ไม่พบอสังหาฯ" });

    const key = makeImageKey(id, file.originalname);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    const updated = await prisma.property.update({
      where: { id },
      data: { img: key }, // ✅ เก็บ key ลง DB
    });

    return res.json(updated);
  } catch (err) {
    console.error("uploadPropertyImage error:", err);
    return res.status(500).json({ message: "อัปโหลดรูปไม่สำเร็จ" });
  }
};

/**
 * DELETE /api/properties/:id (ADMIN)
 */
export const deleteProperty = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.property.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("deleteProperty error:", err);
    if (err?.code === "P2025") return res.status(404).json({ message: "ไม่พบอสังหาฯ" });
    return res.status(500).json({ message: "ลบอสังหาฯ ล้มเหลว" });
  }
};

/**
 * GET /api/properties/image/*
 * stream image from MinIO
 */
export const getPropertyImage = async (req: Request, res: Response) => {
  try {
    const keyRaw = String(req.query.key || "");
    if (!keyRaw) return res.status(400).json({ message: "Missing key" });

    const key = decodeURIComponent(keyRaw);

    const obj = await s3Client.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );

    res.setHeader("Content-Type", obj.ContentType || "image/jpeg");

    const body = obj.Body as any;
    body.pipe(res);
  } catch (err) {
    return res.status(404).json({ message: "ไม่พบรูป" });
  }
};
