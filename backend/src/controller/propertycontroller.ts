import { Request, Response } from "express";
import prisma from "../config/prismaclient";

// helper
function toInt(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeJsonParse<T>(s: any): T | null {
  if (!s || typeof s !== "string") return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

/**
 * เราจะ map "อสังหา" = Product
 * - name -> title
 * - img  -> coverImageUrl
 * - property (string) -> เก็บ JSON รายละเอียด เช่น type/status/location/bed/bath/area
 */

type ProductPropertyJson = {
  type?: string;     // HOUSE/CONDO/TOWNHOUSE...
  status?: string;   // AVAILABLE/RESERVED/SOLD...
  location?: string; // กรุงเทพฯ, นนทบุรี...
  bedrooms?: number;
  bathrooms?: number;
  areaSqm?: number;
  description?: string;
};

function mapProductToPropertyCard(p: any) {
  const meta = safeJsonParse<ProductPropertyJson>(p.property) || {};
  return {
    id: p.id,
    title: p.name,
    price: p.price, // ถ้าหน้าบ้านไม่ใช้ก็ไม่เป็นไร
    type: meta.type || null,
    status: meta.status || null,
    location: meta.location || null,
    bedrooms: meta.bedrooms ?? null,
    bathrooms: meta.bathrooms ?? null,
    areaSqm: meta.areaSqm ?? null,
    description: meta.description || null,
    coverImageUrl: p.img || null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// =====================================================
// GET /api/properties?q=&type=&status=&page=&limit=
// =====================================================
export const getProperties = async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const type = typeof req.query.type === "string" ? req.query.type.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";

    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 12)));
    const skip = (page - 1) * limit;

    // ดึง Product ทั้งหมดแบบมี filter ที่ DB ทำได้ (name)
    const where: any = q
      ? { name: { contains: q, mode: "insensitive" } }
      : {};

    const [total, itemsRaw] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    // filter type/status ที่อยู่ใน JSON ทำใน node (ชั่วคราว)
    let items = itemsRaw.map(mapProductToPropertyCard);

    if (type) items = items.filter((x) => (x.type || "").toLowerCase() === type.toLowerCase());
    if (status) items = items.filter((x) => (x.status || "").toLowerCase() === status.toLowerCase());

    return res.json({
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("getProperties error:", err);
    return res.status(500).json({ message: "ดึงข้อมูลอสังหาริมทรัพย์ล้มเหลว" });
  }
};

// =====================================================
// GET /api/properties/:id
// =====================================================
export const getPropertyById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "id ไม่ถูกต้อง" });

    const p = await prisma.product.findUnique({ where: { id } });
    if (!p) return res.status(404).json({ message: "ไม่พบอสังหาริมทรัพย์" });

    return res.json(mapProductToPropertyCard(p));
  } catch (err) {
    console.error("getPropertyById error:", err);
    return res.status(500).json({ message: "ดึงข้อมูลอสังหาริมทรัพย์ล้มเหลว" });
  }
};

// =====================================================
// POST /api/properties
// body: { title, price?, type?, status?, location?, bedrooms?, bathrooms?, areaSqm?, description?, coverImageUrl? }
// =====================================================
export const createProperty = async (req: Request, res: Response) => {
  try {
    const {
      title,
      price,
      type,
      status,
      location,
      bedrooms,
      bathrooms,
      areaSqm,
      description,
      coverImageUrl,
    } = req.body;

    if (!title) return res.status(400).json({ message: "กรุณากรอก title" });

    const meta: ProductPropertyJson = {
      type,
      status,
      location,
      bedrooms: bedrooms !== undefined ? Number(bedrooms) : undefined,
      bathrooms: bathrooms !== undefined ? Number(bathrooms) : undefined,
      areaSqm: areaSqm !== undefined ? Number(areaSqm) : undefined,
      description,
    };

    const created = await prisma.product.create({
      data: {
        name: String(title).trim(),
        price: price !== undefined ? price : 0, // Decimal: prisma รับ number/string ได้
        property: JSON.stringify(meta),
        img: coverImageUrl || null,
      },
    });

    return res.status(201).json(mapProductToPropertyCard(created));
  } catch (err) {
    console.error("createProperty error:", err);
    return res.status(500).json({ message: "เพิ่มอสังหาริมทรัพย์ไม่สำเร็จ" });
  }
};

// =====================================================
// PUT /api/properties/:id
// =====================================================
export const updateProperty = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "id ไม่ถูกต้อง" });

    const p = await prisma.product.findUnique({ where: { id } });
    if (!p) return res.status(404).json({ message: "ไม่พบอสังหาริมทรัพย์" });

    const currentMeta = safeJsonParse<ProductPropertyJson>(p.property) || {};

    const {
      title,
      price,
      type,
      status,
      location,
      bedrooms,
      bathrooms,
      areaSqm,
      description,
      coverImageUrl,
    } = req.body;

    const nextMeta: ProductPropertyJson = {
      ...currentMeta,
      ...(type !== undefined ? { type } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(bedrooms !== undefined ? { bedrooms: Number(bedrooms) } : {}),
      ...(bathrooms !== undefined ? { bathrooms: Number(bathrooms) } : {}),
      ...(areaSqm !== undefined ? { areaSqm: Number(areaSqm) } : {}),
      ...(description !== undefined ? { description } : {}),
    };

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(title !== undefined ? { name: String(title).trim() } : {}),
        ...(price !== undefined ? { price } : {}),
        property: JSON.stringify(nextMeta),
        ...(coverImageUrl !== undefined ? { img: coverImageUrl } : {}),
      },
    });

    return res.json(mapProductToPropertyCard(updated));
  } catch (err) {
    console.error("updateProperty error:", err);
    return res.status(500).json({ message: "แก้ไขอสังหาริมทรัพย์ไม่สำเร็จ" });
  }
};

// =====================================================
// DELETE /api/properties/:id
// =====================================================
export const deleteProperty = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "id ไม่ถูกต้อง" });

    const p = await prisma.product.findUnique({ where: { id } });
    if (!p) return res.status(404).json({ message: "ไม่พบอสังหาริมทรัพย์" });

    await prisma.product.delete({ where: { id } });
    return res.json({ message: "ลบอสังหาริมทรัพย์สำเร็จ" });
  } catch (err) {
    console.error("deleteProperty error:", err);
    return res.status(500).json({ message: "ลบอสังหาริมทรัพย์ไม่สำเร็จ" });
  }
};

// =====================================================
// รูป: ตอนนี้ Product มีแค่ img 1 รูป
// เลยทำเป็น set cover url แทน upload multiple ก่อน
// =====================================================
export const uploadPropertyImages = async (_req: Request, res: Response) => {
  return res.status(400).json({
    message: "ตอนนี้ schema ใช้ Product.img (รูปเดียว) ยังไม่ได้ทำหลายรูป/MinIO ในตารางแยก",
  });
};

export const setPropertyCover = async (_req: Request, res: Response) => {
  return res.status(400).json({
    message: "ตอนนี้ schema ใช้ Product.img (รูปเดียว) ไม่ต้องตั้ง cover แยก",
  });
};

export const deletePropertyImage = async (_req: Request, res: Response) => {
  return res.status(400).json({
    message: "ตอนนี้ schema ใช้ Product.img (รูปเดียว) ยังไม่มีลบรูปแบบ imageId",
  });
};
