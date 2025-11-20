import { Request, Response } from "express";
import prisma from "../config/prismaclient";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { Prisma } from "@prisma/client";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ====================== HELPERS ======================
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
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    secret,
    {
      expiresIn: "1d",
    }
  );
};

// ====================== REGISTER CUSTOMER (APP) ======================
export const register = async (req: Request, res: Response) => {
  try {
    const { name, tol, email, password, productType, priceBudget, img } =
      req.body;

    if (!name || !tol || !email || !password) {
      return res
        .status(400)
        .json({ message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const tolNorm = normalizePhoneTH(tol);

    // เช็คซ้ำก่อน
    const existed = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailNorm }, { tol: tolNorm }],
      },
    });

    if (existed) {
      return res
        .status(400)
        .json({ message: "อีเมลหรือเบอร์โทรนี้ถูกใช้แล้ว" });
    }

    const hashed = await bcrypt.hash(password, 10);

    // สร้าง User + Customer แบบ nested ก็ได้ แต่ที่คุณเขียนแยกก็โอเค
    const user = await prisma.user.create({
      data: {
        name,
        tol: tolNorm,
        email: emailNorm,
        password: hashed,
        role: "CUSTOMER",
      },
    });

    const customer = await prisma.customer.create({
      data: {
        name,
        tol: tolNorm,
        email: emailNorm,
        img: img ?? null,
        productType: productType ?? null,
        priceBudget:
          priceBudget !== undefined && priceBudget !== null
            ? new Prisma.Decimal(priceBudget)
            : null,
        user: {
          connect: { id: user.id },
        },
      },
    });

    const token = createToken(user);

    return res.status(201).json({
      message: "register success",
      token,
      user,
      customer,
    });
  } catch (err: any) {
    console.error("Register error:", err);
    // handle unique constraint ซ้ำ (กรณีหลุดมา catch)
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res
        .status(400)
        .json({ message: "อีเมลหรือเบอร์โทรนี้ถูกใช้แล้ว" });
    }

    return res.status(500).json({ message: "server error" });
  }
};

// ====================== REGISTER SALES ======================
export const registerSales = async (req: Request, res: Response) => {
  try {
    const { name, tol, email, password } = req.body;

    if (!name || !tol || !email || !password) {
      return res
        .status(400)
        .json({ message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const tolNorm = normalizePhoneTH(tol);

    const existed = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailNorm }, { tol: tolNorm }],
      },
    });

    if (existed) {
      return res
        .status(400)
        .json({ message: "อีเมลหรือเบอร์โทรนี้ถูกใช้แล้ว" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        tol: tolNorm,
        email: emailNorm,
        password: hashed,
        role: "SALE",
      },
    });

    return res.json({ message: "register sale success", user });
  } catch (err: any) {
    console.error("RegisterSales error:", err);
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res
        .status(400)
        .json({ message: "อีเมลหรือเบอร์โทรนี้ถูกใช้แล้ว" });
    }
    return res.status(500).json({ message: "server error" });
  }
};

// ====================== REGISTER MANAGER ======================
export const registerManager = async (req: Request, res: Response) => {
  try {
    const { name, tol, email, password } = req.body;

    if (!name || !tol || !email || !password) {
      return res
        .status(400)
        .json({ message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const tolNorm = normalizePhoneTH(tol);

    const existed = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailNorm }, { tol: tolNorm }],
      },
    });

    if (existed) {
      return res
        .status(400)
        .json({ message: "อีเมลหรือเบอร์โทรนี้ถูกใช้แล้ว" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        tol: tolNorm,
        email: emailNorm,
        password: hashed,
        role: "MANAGER",
      },
    });

    return res.json({ message: "register manager success", user });
  } catch (err: any) {
    console.error("RegisterManager error:", err);
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res
        .status(400)
        .json({ message: "อีเมลหรือเบอร์โทรนี้ถูกใช้แล้ว" });
    }
    return res.status(500).json({ message: "server error" });
  }
};

// ====================== LOGIN (APP – ทุก role) ======================
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

    return res.json({ message: "login success", token, user });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "server error" });
  }
};

// ====================== LOGIN WEB CRM (ห้าม CUSTOMER) ======================
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

    return res.json({ message: "login web success", token, user });
  } catch (err) {
    console.error("LoginWeb error:", err);
    return res.status(500).json({ message: "server error" });
  }
};

// ====================== GOOGLE LOGIN (WEB CRM – STAFF เท่านั้น) ======================
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

    return res.json({ user });
  } catch (err) {
    console.error("Me error:", err);
    return res.status(500).json({ message: "server error" });
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

    return res.json({ token: newToken });
  } catch (err) {
    console.error("RefreshToken error:", err);
    return res.status(401).json({ message: "token invalid" });
  }
};

// ====================== LOGOUT ======================
export const logout = async (req: Request, res: Response) => {
  return res.json({ message: "logout success" });
};
