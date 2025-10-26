import { Request, Response } from "express";
import prisma from "../config/prismaclient";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const normalizePhoneTH = (raw: string) => {
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return raw;
  if (digits.length === 10 && digits.startsWith("0")) return `+66${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("66")) return `+${digits}`;
  if (digits.length === 11 && raw.startsWith("+66")) return `+${digits}`;
  return raw;
};

/** ========== Register Customer ========== */
export const register = async (req: Request, res: Response) => {
  try {
    const { name, tol, email, password } = req.body;

    if (!name || !tol || !email || !password) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const tolNorm = normalizePhoneTH(tol);

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: emailNorm }, { tol: tolNorm }] },
    });
    if (existingUser) {
      return res.status(400).json({ message: "อีเมลหรือเบอร์นี้ถูกใช้งานแล้ว" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        tol: tolNorm,
        email: emailNorm,
        password: hashedPassword,
        role: "CUSTOMER",
      },
      select: { id: true, name: true, email: true, tol: true, role: true },
    });

    return res.status(201).json({
      message: "สมัครสมาชิกสำเร็จ",
      user: newUser,
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
};

/** ========== Register SALE ========== */
export const registerSales = async (req: Request, res: Response) => {
  try {
    const { name, tol, email, password } = req.body;

    if (!name || !tol || !email || !password) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const tolNorm = normalizePhoneTH(tol);

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: emailNorm }, { tol: tolNorm }] },
    });
    if (existingUser) {
      return res.status(400).json({ message: "อีเมลหรือเบอร์นี้ถูกใช้งานแล้ว" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        tol: tolNorm,
        email: emailNorm,
        password: hashedPassword,
        role: "SALE",
      },
      select: { id: true, name: true, email: true, tol: true, role: true },
    });

    return res.status(201).json({
      message: "สมัครสมาชิกพนักงานขายสำเร็จ",
      user: newUser,
    });
  } catch (error) {
    console.error("Register Sales Error:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
};

/** ========== Register MANAGER ========== */
export const registerManager = async (req: Request, res: Response) => {
  try {
    const { name, tol, email, password } = req.body;

    if (!name || !tol || !email || !password) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const tolNorm = normalizePhoneTH(tol);

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: emailNorm }, { tol: tolNorm }] },
    });
    if (existingUser) {
      return res.status(400).json({ message: "อีเมลหรือเบอร์นี้ถูกใช้งานแล้ว" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        tol: tolNorm,
        email: emailNorm,
        password: hashedPassword,
        role: "MANAGER",
      },
      select: { id: true, name: true, email: true, tol: true, role: true },
    });

    return res.status(201).json({
      message: "สมัครสมาชิกผู้จัดการสำเร็จ",
      user: newUser,
    });
  } catch (error) {
    console.error("Register Manager Error:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, email, password } = req.body;
    const idRaw = (identifier ?? email) as string | undefined;

    if (!idRaw || !password) {
      return res
        .status(400)
        .json({ message: "กรุณากรอก identifier/email และรหัสผ่าน" });
    }

    const looksLikeEmail = idRaw.includes("@");

    const user = looksLikeEmail
      ? await prisma.user.findUnique({
          where: { email: idRaw.trim().toLowerCase() },
        })
      : await prisma.user.findFirst({
          where: {
            OR: [{ tol: normalizePhoneTH(idRaw) }, { tol: idRaw }],
          },
        });

    if (!user) {
      return res.status(404).json({ message: "ไม่พบบัญชีผู้ใช้" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });
    }

    const secret = process.env.JWT_SECRET || "dev_secret"; 
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: "1d" } 
    );

    return res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tol: user.tol,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
};


/** ========== Logout ========== */
export const logout = async (req: Request, res: Response) => {
  try {
    if ((req as any).cookies?.access_token) {
      res.clearCookie("access_token", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }

    return res.status(200).json({ message: "ออกจากระบบสำเร็จ" });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
};
