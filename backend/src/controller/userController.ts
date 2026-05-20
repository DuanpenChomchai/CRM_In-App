import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/prismaclient";
import { AuthRequest } from "../middlewares/authMiddleware";
import { getIO } from "../ws";

// ✅ MinIO via AWS SDK v3
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client, { BUCKET_NAME } from "../config/minioclient";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { log } from "console";
/* =======================
   Utility: Normalize Phone
   ======================= */
const normalizePhoneTH = (raw?: string | null) => {
  if (!raw) return raw ?? null;
  const digits = String(raw).replace(/\D/g, "");

  if (digits.length === 10 && digits.startsWith("0"))
    return `+66${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("66")) return `+${digits}`;
  if (digits.length === 11 && raw.startsWith("+66")) return `+${digits}`;

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
   Helper: build public image url from filename
   ======================= */
const buildProfileImageUrl = (userId: number, filename?: string | null) => {
  if (!filename) return null;
  const base = (
    process.env.MINIO_PUBLIC_URL ||
    process.env.MINIO_ENDPOINT ||
    ""
  ).replace(/\/+$/, "");
  return `${base}/${BUCKET_NAME}/profiles/${userId}/${filename}`;
};

/* =======================
   GET: listUsers (สำหรับ Web CRM / Admin)
   ======================= */
export const listUsers = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page ?? "1"), 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt(String(req.query.pageSize ?? "20"), 10), 1),
      100,
    );

    const q = String(req.query.q ?? "");
    const reqRole = req.query.role ? String(req.query.role) : undefined;

    const where: any = buildWhere(q);

    if (reqRole === "NOT_CUSTOMER") where.role = { not: "CUSTOMER" };
    else if (reqRole === "SALE" || reqRole === "MANAGER" || reqRole === "ADMIN")
      where.role = reqRole;
    else where.role = { not: "CUSTOMER" };

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
          img: true, // DB เก็บ filename
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    // ✅ ส่ง img เป็น URL เต็มให้ frontend
    const mappedItems = items.map((u) => ({
      ...u,
      img: buildProfileImageUrl(u.id, u.img),
    }));

    return res.json({
      data: mappedItems,
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
        img: true, // filename
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้" });

    return res.json({
      ...user,
      img: buildProfileImageUrl(user.id, user.img),
    });
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
        img: img ?? null, // (admin create) ถ้าจะใส่ก็ใส่ filename เท่านั้น
        role: role ?? "CUSTOMER",
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
    if (img !== undefined) data.img = img ?? null; // (admin update) ถ้าจะส่งให้ส่ง filename เท่านั้น
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
        img: true, // filename
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({
      ...updated,
      img: buildProfileImageUrl(updated.id, updated.img),
    });
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

    if (err?.code === "P2025")
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    return res.status(500).json({ message: "ลบผู้ใช้ล้มเหลว" });
  }
};

/* =======================
   GET: getMe (ดึงข้อมูล user จาก token สำหรับ Mobile/Web)
   ======================= */
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id)
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้ใน token" });

    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        tol: true,
        img: true, // filename
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!me) return res.status(404).json({ message: "ไม่พบผู้ใช้" });

    return res.json({
      user: {
        ...me,
        img: buildProfileImageUrl(me.id, me.img),
      },
    });
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
      100,
    );

    const q = String(req.query.q ?? "");
    const where: any = buildWhere(q);
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
          img: true, // filename
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const mappedItems = items.map((u) => ({
      ...u,
      img: buildProfileImageUrl(u.id, u.img),
    }));

    return res.json({
      data: mappedItems,
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

    // ✅ ไม่รับ img จาก body (ให้ไปใช้เส้น upload รูปเท่านั้น)
    const { name, email, password, tol } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      tol?: string;
    };

    const data: any = {};

    if (name) data.name = name.trim();
    if (email) data.email = email.trim().toLowerCase();
    if (tol) data.tol = normalizePhoneTH(tol);

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
        img: true, // filename
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // ✅ ถ้า user เป็น CUSTOMER -> sync ข้อมูลไปยัง customers table ด้วย
    if (req.user?.role === "CUSTOMER") {
      try {
        const syncData: any = {};
        if (name !== undefined) syncData.name = name.trim();
        if (email !== undefined) syncData.email = email.trim().toLowerCase();
        if (tol !== undefined) syncData.tol = normalizePhoneTH(tol);

        if (Object.keys(syncData).length > 0) {
          const customers = await prisma.customer.findMany({
            where: { userId },
            select: { id: true }
          });

          if (customers.length > 0) {
            await prisma.customer.updateMany({
              where: { userId },
              data: syncData,
            });

            // Emit socket updates for each updated customer
            try {
              const io = getIO();
              for (const cust of customers) {
                const fullUpdated = await prisma.customer.findUnique({
                  where: { id: cust.id },
                  include: {
                    user: {
                      select: { id: true, name: true, email: true, tol: true, img: true, role: true }
                    },
                    sale: {
                      select: { id: true, name: true, email: true, tol: true, img: true, role: true }
                    }
                  }
                });
                if (fullUpdated) {
                  io.to("role:ADMIN").emit("customer:updated", fullUpdated);
                  io.to("role:MANAGER").emit("customer:updated", fullUpdated);
                  io.to("role:SALE").emit("customer:updated", fullUpdated);
                  console.log("📢 Emit (updateMe) → customer:updated:", fullUpdated.id);
                }
              }
            } catch (wsErr) {
              console.warn("Socket.IO emit failed during customer sync:", wsErr);
            }
          }
        }
      } catch (syncErr) {
        console.warn("[updateMe] sync customer failed:", syncErr);
      }
    }

    return res.json({
      user: {
        ...updated,
        img: buildProfileImageUrl(updated.id, updated.img),
      },
    });
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

/* =======================
   PUT: uploadProfileImage (MinIO)
   ======================= */

type AuthRequestWithFile = AuthRequest & { file?: Express.Multer.File };
export const getUserProfle = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.img) {
      return res.status(404).json({ message: "Image not found" });
    }

    const result = await s3Client.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: user.img, // ✅ key เต็ม
      }),
    );

    if (!result.Body) {
      return res.status(404).json({ message: "File not found in S3" });
    }

    if (result.ContentType) {
      res.setHeader("Content-Type", result.ContentType);
    }

    const body = result.Body as any;
    if (typeof body.pipe === "function") {
      body.pipe(res);
      return;
    }

    return res.status(500).json({ message: "Unsupported stream type" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const uploadProfileImage = async (
  req: AuthRequestWithFile,
  res: Response,
) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
    if (!req.file)
      return res.status(400).json({ message: "กรุณาอัปโหลดไฟล์รูป" });
    if (!BUCKET_NAME)
      return res.status(500).json({ message: "MINIO_BUCKET ไม่ถูกตั้งค่า" });

    // ✅ filename ที่เก็บลง DB
    const original = req.file.originalname || "profile.jpg";
    const extRaw = original.includes(".") ? original.split(".").pop() : "jpg";
    const ext =
      (extRaw || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";

    const filename = `${randomUUID()}.${ext}`;
    const key = `${filename}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      }),
    );

    // ✅ เก็บลง DB แค่ filename
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { img: filename },
      select: {
        id: true,
        name: true,
        email: true,
        tol: true,
        img: true, // filename
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    // ✅ ถ้า user เป็น CUSTOMER -> sync รูปโปรไฟล์ไปยัง customers table ด้วย
    if (req.user?.role === "CUSTOMER") {
      try {
        const customers = await prisma.customer.findMany({
          where: { userId: req.user.id },
          select: { id: true }
        });

        if (customers.length > 0) {
          await prisma.customer.updateMany({
            where: { userId: req.user.id },
            data: { img: filename },
          });

          // Emit socket update for each updated customer
          try {
            const io = getIO();
            for (const cust of customers) {
              const fullUpdated = await prisma.customer.findUnique({
                where: { id: cust.id },
                include: {
                  user: {
                    select: { id: true, name: true, email: true, tol: true, img: true, role: true }
                  },
                  sale: {
                    select: { id: true, name: true, email: true, tol: true, img: true, role: true }
                  }
                }
              });
              if (fullUpdated) {
                io.to("role:ADMIN").emit("customer:updated", fullUpdated);
                io.to("role:MANAGER").emit("customer:updated", fullUpdated);
                io.to("role:SALE").emit("customer:updated", fullUpdated);
                console.log("📢 Emit (uploadProfileImage) → customer:updated:", fullUpdated.id);
              }
            }
          } catch (wsErr) {
            console.warn("Socket.IO emit failed during customer image upload sync:", wsErr);
          }
        }
      } catch (syncErr) {
        console.warn("[uploadProfileImage] sync customer image failed:", syncErr);
      }
    }

    // ✅ ส่งออกเป็น URL เต็มให้ frontend
    return res.json({
      message: "Upload profile image success",
      user: {
        ...updated,
        img: buildProfileImageUrl(updated.id, updated.img),
      },
      filename,
    });
  } catch (err) {
    console.error("uploadProfileImage error:", err);
    return res.status(500).json({ message: "อัปโหลดรูปโปรไฟล์ล้มเหลว" });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  const userId = Number(req.params.id);

  if (Number.isNaN(userId)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const profile = await prisma.user.findUnique({
    where: { id: userId },
  });

  console.log("profile", profile);

  if (!profile?.img) {
    return res.json({
      message: "No profile image",
    });
  }
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: profile.img,
  });
  

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600,
  });

  return res.json({
    img: signedUrl,
  })
};

/* =======================
   GET: getManagersWithTeams
   ดึง Manager ทั้งหมด พร้อมรายชื่อ SALE ในทีม
   ======================= */
export const getManagersWithTeams = async (req: Request, res: Response) => {
  try {
    const managers = await prisma.user.findMany({
      where: { role: "MANAGER" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        tol: true,
        img: true,
        role: true,
        // ดึง SALE ที่มี managerId ชี้มาหา manager นี้
        team: {
          where: { role: "SALE" },
          select: {
            id: true,
            name: true,
            email: true,
            tol: true,
            img: true,
            role: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });

    // ดึง SALE ที่ยังไม่มี manager
    const unassignedSales = await prisma.user.findMany({
      where: { role: "SALE", managerId: null },
      select: { id: true, name: true, email: true, tol: true, img: true, role: true },
      orderBy: { name: "asc" },
    });

    const mappedManagers = managers.map((m) => ({
      ...m,
      img: buildProfileImageUrl(m.id, m.img),
      team: m.team.map((s) => ({
        ...s,
        img: buildProfileImageUrl(s.id, s.img),
      })),
    }));

    return res.json({
      managers: mappedManagers,
      unassignedSales: unassignedSales.map((s) => ({
        ...s,
        img: buildProfileImageUrl(s.id, s.img),
      })),
    });
  } catch (err) {
    console.error("getManagersWithTeams error:", err);
    return res.status(500).json({ message: "ดึงข้อมูลทีมล้มเหลว" });
  }
};

/* =======================
   PATCH: assignManager
   กำหนด managerId ให้ SALE user
   ======================= */
export const assignManager = async (req: Request, res: Response) => {
  try {
    const saleId = Number(req.params.saleId);
    if (Number.isNaN(saleId)) {
      return res.status(400).json({ message: "saleId ไม่ถูกต้อง" });
    }

    const { managerId } = req.body;

    // ตรวจว่า sale มีอยู่และเป็น SALE role
    const sale = await prisma.user.findFirst({
      where: { id: saleId, role: "SALE" },
    });
    if (!sale) {
      return res.status(404).json({ message: "ไม่พบพนักงานขาย" });
    }

    // ถ้าส่ง managerId = null → ลบออกจากทีม
    let finalManagerId: number | null = null;
    if (managerId !== null && managerId !== undefined && managerId !== "") {
      const manager = await prisma.user.findFirst({
        where: { id: Number(managerId), role: "MANAGER" },
      });
      if (!manager) {
        return res.status(404).json({ message: "ไม่พบผู้จัดการ" });
      }
      finalManagerId = Number(managerId);
    }

    const updated = await prisma.user.update({
      where: { id: saleId },
      data: { managerId: finalManagerId },
      select: { id: true, name: true, email: true, tol: true, img: true, role: true, managerId: true },
    });

    return res.json({
      ...updated,
      img: buildProfileImageUrl(updated.id, updated.img),
    });
  } catch (err) {
    console.error("assignManager error:", err);
    return res.status(500).json({ message: "กำหนดผู้จัดการไม่สำเร็จ" });
  }
};
