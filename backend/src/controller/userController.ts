import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/prismaclient";

const normalizePhoneTH = (raw?: string | null) => {
  if (!raw) return raw ?? null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return raw;
  if (digits.length === 10 && digits.startsWith("0")) return `+66${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("66")) return `+${digits}`;
  if (digits.length === 11 && raw.startsWith("+66")) return `+${digits}`;
  return raw;
};

const stripSensitive = <T extends any>(u: T) => {
  if (!u) return u;
  const { password, ...safe } = u as any;
  return safe;
};

const buildWhere = (q?: string, role?: string) => {
  const where: any = {};
  if (q && q.trim()) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { tol: { contains: q, mode: "insensitive" } },
    ];
  }
  if (role) where.role = role as any;
  return where;
};

export const listUsers = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page ?? "1"), 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt(String(req.query.pageSize ?? "20"), 10), 1),
      100
    );
    const q = String(req.query.q ?? "");
    const role = req.query.role ? String(req.query.role) : undefined;

    const where = buildWhere(q, role);

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          tol: true,
          img: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          // ไม่ select password
        },
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      data: items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("listUsers error:", err);
    return res.status(500).json({ message: "ดึงรายการผู้ใช้ล้มเหลว" });
  }
};


export const getUserById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        tol: true,
        img: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    return res.json(user);
  } catch (err) {
    console.error("getUserById error:", err);
    return res.status(500).json({ message: "ดึงข้อมูลผู้ใช้ล้มเหลว" });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, tol, img, role } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      tol?: string;
      img?: string | null;
      role?: "CUSTOMER" | "SALE" | "MANAGER" | "ADMIN";
    };

    if (!name || !email || !password) {
      return res.status(400).json({ message: "กรุณากรอก name, email, password" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const tolNorm = normalizePhoneTH(tol);

    const hashed = await bcrypt.hash(password, 10);

    const created = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailNorm,
        password: hashed,
        tol: tolNorm ?? "",
        img: img ?? null,
        role: role ?? "CUSTOMER", 
      },
    });

    return res.status(201).json(stripSensitive(created));
  } catch (err: any) {
    console.error("createUser error:", err);
    if (err?.code === "P2002") {
      const fields = (err?.meta?.target as string[])?.join(", ");
      return res
        .status(409)
        .json({ message: `ข้อมูลซ้ำ (unique): ${fields || "email/tol"}` });
    }
    return res.status(500).json({ message: "สร้างผู้ใช้ล้มเหลว" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { name, email, password, tol, img, role } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      tol?: string;
      img?: string | null;
      role?: "CUSTOMER" | "SALE" | "MANAGER" | "ADMIN";
    };

    const data: any = {};
    if (typeof name === "string") data.name = name.trim();
    if (typeof email === "string") data.email = email.trim().toLowerCase();
    if (typeof tol === "string") data.tol = normalizePhoneTH(tol);
    if (typeof img !== "undefined") data.img = img ?? null;
    if (typeof role === "string") data.role = role;
    if (typeof password === "string" && password.trim().length > 0) {
      data.password = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        tol: true,
        img: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    console.error("updateUser error:", err);
    if (err?.code === "P2002") {
      const fields = (err?.meta?.target as string[])?.join(", ");
      return res.status(409).json({ message: `ข้อมูลซ้ำ (unique): ${fields}` });
    }
    if (err?.code === "P2025") {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }
    return res.status(500).json({ message: "อัปเดตผู้ใช้ล้มเหลว" });
  }
};


export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.user.delete({ where: { id } });
    return res.json({ message: "ลบผู้ใช้สำเร็จ" });
  } catch (err: any) {
    console.error("deleteUser error:", err);
    if (err?.code === "P2025") {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }
    return res.status(500).json({ message: "ลบผู้ใช้ล้มเหลว" });
  }
};
