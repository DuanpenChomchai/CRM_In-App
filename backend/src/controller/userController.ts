// src/controller/userController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/prismaclient";
import { AuthRequest } from "../middlewares/authMiddleware";

/* =======================
   Utility: Normalize Phone
   ======================= */
const normalizePhoneTH = (raw?: string | null) => {
  if (!raw) return raw ?? null;
  const digits = String(raw).replace(/\D/g, "");

  if (digits.length === 10 && digits.startsWith("0"))
    return `+66${digits.slice(1)}`;

  if (digits.length === 11 && digits.startsWith("66"))
    return `+${digits}`;

  if (digits.length === 11 && raw.startsWith("+66"))
    return `+${digits}`;

  return raw;
};

/* =======================
   Remove Sensitive Fields
   ======================= */
const stripSensitive = <T extends any>(u: T) => {
  if (!u) return u;
  const { password, ...safe } = u as any;
  return safe;
};

/* =======================
   Build Search Condition
   ======================= */
const buildWhere = (q?: string) => {
  const where: any = {};

  if (q && q.trim()) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { tol: { contains: q, mode: "insensitive" } },
    ];
  }

  return where;
};

/* =======================
   GET: listUsers (สำหรับ Web CRM / Admin)
   ======================= */
export const listUsers = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page ?? "1"), 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt(String(req.query.pageSize ?? "20"), 10), 1),
      100
    );

    const q = String(req.query.q ?? "");
    const reqRole = req.query.role ? String(req.query.role) : undefined;

    const where: any = buildWhere(q);

    /* ------------------------------
       ROLE FILTER LOGIC (สำคัญมาก)
       ------------------------------ */

    // 1) ถ้า role=NOT_CUSTOMER → ไม่เอา CUSTOMER
    if (reqRole === "NOT_CUSTOMER") {
      where.role = { not: "CUSTOMER" };
    }

    // 2) ถ้าระบุ role ปกติ เช่น SALE / MANAGER / ADMIN
    else if (
      reqRole === "SALE" ||
      reqRole === "MANAGER" ||
      reqRole === "ADMIN"
    ) {
      where.role = reqRole;
    }

    // 3) ถ้าไม่ส่ง role มาเลย → default = ไม่เอาลูกค้า
    else {
      where.role = { not: "CUSTOMER" };
    }

    /* Query */
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

/* =======================
   GET: getUserById (สำหรับ Web CRM / Admin)
   ======================= */
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

/* =======================
   POST: createUser (สำหรับ Web CRM / Admin)
   ======================= */
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
      return res
        .status(400)
        .json({ message: "กรุณากรอก name, email, password" });
    }

    const emailNorm = email.trim().toLowerCase();
    const phoneNorm = normalizePhoneTH(tol);
    const hashed = await bcrypt.hash(password, 10);

    const created = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailNorm,
        password: hashed,
        tol: phoneNorm ?? "",
        img: img ?? null,
        role: role ?? "CUSTOMER", // default ลูกค้าจาก mobile app
      },
    });

    return res.status(201).json(stripSensitive(created));
  } catch (err: any) {
    console.error("createUser error:", err);

    if (err?.code === "P2002") {
      const fields = (err?.meta?.target as string[])?.join(", ");
      return res.status(409).json({ message: `ข้อมูลซ้ำ: ${fields}` });
    }

    return res.status(500).json({ message: "สร้างผู้ใช้ล้มเหลว" });
  }
};

/* =======================
   PUT: updateUser (สำหรับ Web CRM / Admin แก้ user คนอื่น)
   ======================= */
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

    if (name) data.name = name.trim();
    if (email) data.email = email.trim().toLowerCase();
    if (tol) data.tol = normalizePhoneTH(tol);
    if (img !== undefined) data.img = img ?? null;
    if (role) data.role = role;

    if (password && password.trim().length > 0) {
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
      return res.status(409).json({ message: `ข้อมูลซ้ำ: ${fields}` });
    }

    if (err?.code === "P2025") {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    return res.status(500).json({ message: "อัปเดตผู้ใช้ล้มเหลว" });
  }
};

/* =======================
   DELETE: deleteUser (สำหรับ Web CRM / Admin)
   ======================= */
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

/* =======================
   GET: getMe (ดึงข้อมูล user จาก token สำหรับ Mobile/Web)
   ======================= */
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้ใน token" });
    }

    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
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

    if (!me) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    return res.json(me);
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ message: "ดึงข้อมูลผู้ใช้ล้มเหลว" });
  }
};

/* =======================
   GET: listSales (ดึงเฉพาะผู้ใช้ที่เป็น SALE)
   ======================= */
export const listSales = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page ?? "1"), 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt(String(req.query.pageSize ?? "20"), 10), 1),
      100
    );

    const q = String(req.query.q ?? "");

    // ใช้ buildWhere เหมือนเดิม
    const where: any = buildWhere(q);

    // บังคับ role เป็น SALE อย่างเดียว
    where.role = "SALE";

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
    console.error("listSales error:", err);
    return res.status(500).json({ message: "ดึงรายการเซลล์ล้มเหลว" });
  }
};

/* =======================
   PUT: updateMe (ให้ user แก้โปรไฟล์ตัวเอง)
   ======================= */
export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้ใน token" });
    }

    const userId = req.user.id;

    const { name, email, password, tol, img } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      tol?: string;
      img?: string | null;
    };

    const data: any = {};

    if (name) data.name = name.trim();
    if (email) data.email = email.trim().toLowerCase();
    if (tol) data.tol = normalizePhoneTH(tol);
    if (img !== undefined) data.img = img ?? null;

    if (password && password.trim().length > 0) {
      data.password = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
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
    console.error("updateMe error:", err);

    if (err?.code === "P2002") {
      const fields = (err?.meta?.target as string[])?.join(", ");
      return res.status(409).json({ message: `ข้อมูลซ้ำ: ${fields}` });
    }

    if (err?.code === "P2025") {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    return res.status(500).json({ message: "อัปเดตโปรไฟล์ล้มเหลว" });
  }

  
  

  
};
