import { Request, Response } from "express";
import prisma from "../config/prismaclient";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { Prisma } from "@prisma/client";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const normalizePhoneTH = (raw: string) => {
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return raw;
  if (digits.length === 10 && digits.startsWith("0"))
    return `+66${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("66")) return `+${digits}`;
  if (digits.length === 11 && raw.startsWith("+66")) return `+${digits}`;
  return raw;
};

const createToken = (user: any) => {
  const secret = process.env.JWT_SECRET || "dev_secret";
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, secret, {
    expiresIn: "1d",
  });
};

// ====================== REGISTER CUSTOMER ======================
export const register = async (req: Request, res: Response) => {
  try {
    const { name, tol, email, password, productType, priceBudget, img } =
      req.body;

    if (!name || !tol || !email || !password) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const tolNorm = normalizePhoneTH(tol);

    const hashed = await bcrypt.hash(password, 10);

    // 1) สร้าง User (role CUSTOMER)
    const user = await prisma.user.create({
      data: {
        name,
        tol: tolNorm,
        email: emailNorm,
        password: hashed,
        role: "CUSTOMER",
      },
    });

    // 2) สร้าง Customer ผูกกับ userId
    const customer = await prisma.customer.create({
      data: {
        name,
        tol: tolNorm,
        email: emailNorm,
        img: img ?? null,
        productType: productType ?? null,
        // 👇 ใช้ Prisma.Decimal ให้ตรง type Decimal?
        priceBudget:
          priceBudget !== undefined && priceBudget !== null
            ? new Prisma.Decimal(priceBudget)
            : null,
        user: {
          connect: { id: user.id },
        },
      },
    });

    res.json({ message: "register success", user, customer });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "server error" });
  }
};

// ====================== REGISTER SALES ======================
export const registerSales = async (req: Request, res: Response) => {
  try {
    const { name, tol, email, password } = req.body;

    if (!name || !tol || !email || !password) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        tol: normalizePhoneTH(tol),
        email: String(email).trim().toLowerCase(),
        password: hashed,
        role: "SALE",
      },
    });

    res.json({ message: "register sale success", user });
  } catch (err) {
    console.error("RegisterSales error:", err);
    res.status(500).json({ message: "server error" });
  }
};

// ====================== REGISTER MANAGER ======================
export const registerManager = async (req: Request, res: Response) => {
  try {
    const { name, tol, email, password } = req.body;

    if (!name || !tol || !email || !password) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        tol: normalizePhoneTH(tol),
        email: String(email).trim().toLowerCase(),
        password: hashed,
        role: "MANAGER",
      },
    });

    res.json({ message: "register manager success", user });
  } catch (err) {
    console.error("RegisterManager error:", err);
    res.status(500).json({ message: "server error" });
  }
};

// ====================== LOGIN (ใช้กับ App – ทุก role เข้าได้) ======================
export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, email, password } = req.body;
    const idRaw = (identifier ?? email) as string;

    if (!idRaw || !password) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบ" });
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

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "รหัสผ่านผิด!" });
    }

    const token = createToken(user);

    res.json({ message: "login success", token, user });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "server error" });
  }
};

// ====================== LOGIN WEB CRM (ลูกค้าเข้าไม่ได้) ======================
export const loginWeb = async (req: Request, res: Response) => {
  try {
    const { identifier, email, password } = req.body;
    const idRaw = (identifier ?? email) as string;

    if (!idRaw || !password) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบ" });
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

    // ⛔ ไม่ให้ CUSTOMER เข้า Web CRM
    if (user.role === "CUSTOMER") {
      return res
        .status(403)
        .json({ message: "บัญชีนี้ไม่มีสิทธิ์เข้าสู่ระบบเว็บ CRM" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "รหัสผ่านผิด!" });
    }

    const token = createToken(user);

    res.json({ message: "login web success", token, user });
  } catch (err) {
    console.error("LoginWeb error:", err);
    res.status(500).json({ message: "server error" });
  }
};

// ====================== GOOGLE LOGIN (ใช้กับ Web CRM – เฉพาะ STAFF) ======================
export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "missing credential" });
    }

    // 1. verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ message: "Google token invalid" });
    }

    const email = payload.email;

    // 2. หาในฐานข้อมูล
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    // 3. ต้องมี user ในระบบก่อน
    if (!existingUser) {
      return res.status(403).json({
        message: "บัญชีนี้ไม่มีสิทธิ์เข้าระบบ CRM",
      });
    }

    // 4. เฉพาะ ADMIN, SALE, MANAGER เท่านั้น
    const allowed = ["ADMIN", "SALE", "MANAGER"];
    if (!allowed.includes(existingUser.role)) {
      return res.status(403).json({
        message: "บัญชีนี้ไม่มีสิทธิ์เข้าระบบ CRM",
      });
    }

    // 5. ออก token พร้อม role
    const token = jwt.sign(
      {
        id: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
      },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "3h" }
    );

    return res.json({
      message: "Google login success",
      token,
      user: existingUser,
    });
  } catch (error) {
    console.error("Google Login Error:", error);
    return res.status(500).json({ message: "Google login failed" });
  }
};

// ====================== ME ======================
export const me = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    res.json({ user });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ message: "server error" });
  }
};

// ====================== REFRESH TOKEN ======================
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "missing token" });
    }

    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev_secret"
    );

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({ message: "token invalid" });
    }

    const newToken = createToken(user);

    res.json({ token: newToken });
  } catch (err) {
    console.error("RefreshToken error:", err);
    res.status(401).json({ message: "token invalid" });
  }
};

// ====================== LOGOUT ======================
export const logout = async (req: Request, res: Response) => {
  res.json({ message: "logout success" });
};
