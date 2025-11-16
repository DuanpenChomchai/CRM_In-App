import { Request, Response } from "express";
import prisma from "../config/prismaclient";

interface AuthUser {
  id: number;
  email: string;
  role: string;
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

const normalizePhoneTH = (raw?: string | null) => {
  if (!raw) return raw ?? null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return raw;
  if (digits.length === 10 && digits.startsWith("0")) return `+66${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("66")) return `+${digits}`;
  if (digits.length === 11 && raw.startsWith("+66")) return `+${digits}`;
  return raw;
};

const buildWhere = (q?: string, customerId?: number, hasVoice?: string, dateFrom?: string, dateTo?: string) => {
  const where: any = {};
  if (q && q.trim()) {
    where.OR = [
      { phone: { contains: q, mode: "insensitive" } },
      { chat: { contains: q, mode: "insensitive" } },
      { voiceNote: { contains: q, mode: "insensitive" } },
    ];
  }
  if (customerId) where.customerId = customerId;
  if (hasVoice === "true") where.voiceNote = { not: null };
  if (hasVoice === "false") where.voiceNote = null;

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) {
      // รวมทั้งวัน
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }
  return where;
};

const baseSelect = {
  id: true,
  phone: true,
  chat: true,
  voiceNote: true,
  customerId: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { id: true, name: true, email: true } },
  user: { select: { id: true, name: true, email: true, role: true } },
};

export const listCommunications = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page ?? "1"), 10), 1);
    const pageSize = Math.min(Math.max(parseInt(String(req.query.pageSize ?? "20"), 10), 1), 100);

    const q = String(req.query.q ?? "");
    const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
    const hasVoice = req.query.hasVoice ? String(req.query.hasVoice) : undefined;
    const from = req.query.from ? String(req.query.from) : undefined;
    const to = req.query.to ? String(req.query.to) : undefined;

    const where = buildWhere(q, customerId, hasVoice, from, to);

    const [items, total] = await Promise.all([
      prisma.communications.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: baseSelect,
      }),
      prisma.communications.count({ where }),
    ]);

    return res.json({
      data: items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("listCommunications error:", err);
    return res.status(500).json({ message: "ดึงรายการการสื่อสารล้มเหลว" });
  }
};

export const getCommunicationById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const cm = await prisma.communications.findUnique({
      where: { id },
      select: baseSelect,
    });
    if (!cm) return res.status(404).json({ message: "ไม่พบรายการสื่อสาร" });
    return res.json(cm);
  } catch (err) {
    console.error("getCommunicationById error:", err);
    return res.status(500).json({ message: "ดึงข้อมูลล้มเหลว" });
  }
};

export const createCommunication = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, phone, chat, voiceNote, userId } = req.body as {
      customerId?: number;
      phone?: string | null;
      chat?: string | null;
      voiceNote?: string | null;
      userId?: number | null;
    };

    if (!customerId) {
      return res.status(400).json({ message: "กรุณาระบุ customerId" });
    }

    const data: any = {
      customerId: Number(customerId),
      phone: typeof phone === "string" ? normalizePhoneTH(phone) : null,
      chat: typeof chat === "string" ? chat : null,
      voiceNote: typeof voiceNote === "string" ? voiceNote : null,
      userId: userId ?? req.user?.id ?? null,
    };

    console.log("createCommunication data:", data);
    const created = await prisma.communications.create({
      data,
      select: baseSelect,
    });

    console.log("created", created);

    return res.status(201).json(created);
  } catch (err: any) {
    console.error("createCommunication error:", err);
    if (err?.code === "P2003") {
      return res.status(400).json({ message: "customerId หรือ userId ไม่ถูกต้อง (FK)" });
    }
    return res.status(500).json({ message: "สร้างรายการสื่อสารล้มเหลว" });
  }
};

export const updateCommunication = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { phone, chat, voiceNote, customerId, userId } = req.body as {
      phone?: string | null;
      chat?: string | null;
      voiceNote?: string | null;
      customerId?: number;
      userId?: number | null;
    };

    const data: any = {};
    if (typeof phone !== "undefined") data.phone = phone ? normalizePhoneTH(phone) : null;
    if (typeof chat !== "undefined") data.chat = chat ?? null;
    if (typeof voiceNote !== "undefined") data.voiceNote = voiceNote ?? null;
    if (typeof customerId !== "undefined") data.customerId = Number(customerId);
    if (typeof userId !== "undefined") data.userId = userId ?? null;

    const updated = await prisma.communications.update({
      where: { id },
      data,
      select: baseSelect,
    });

    return res.json(updated);
  } catch (err: any) {
    console.error("updateCommunication error:", err);
    if (err?.code === "P2025") {
      return res.status(404).json({ message: "ไม่พบรายการสื่อสาร" });
    }
    if (err?.code === "P2003") {
      return res.status(400).json({ message: "ค่า FK (customerId/userId) ไม่ถูกต้อง" });
    }
    return res.status(500).json({ message: "อัปเดตรายการสื่อสารล้มเหลว" });
  }
};

export const deleteCommunication = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.communications.delete({ where: { id } });
    return res.json({ message: "ลบสำเร็จ" });
  } catch (err: any) {
    console.error("deleteCommunication error:", err);
    if (err?.code === "P2025") {
      return res.status(404).json({ message: "ไม่พบรายการสื่อสาร" });
    }
    return res.status(500).json({ message: "ลบรายการสื่อสารล้มเหลว" });
  }
};
