import { Request, Response } from "express";
import prisma from "../config/prismaclient";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
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

// ========== Access Token (อายุ 15 นาที) ==========
const createAccessToken = (user: any) => {
  const secret = process.env.JWT_SECRET || "dev_secret";
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn: "15m" }
  );
};

// ========== Refresh Token (อายุ 30 วัน, เก็บใน DB) ==========
const REFRESH_TOKEN_DAYS = 30;

const createRefreshToken = async (userId: number): Promise<string> => {
  const secret = process.env.JWT_REFRESH_SECRET || "dev_refresh_secret";
  const token = jwt.sign(
    { userId, jti: crypto.randomBytes(16).toString("hex") },
    secret,
    { expiresIn: `${REFRESH_TOKEN_DAYS}d` }
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  return token;
};

// ลบ refresh token ที่หมดอายุแล้วของ user (cleanup)
const cleanupExpiredTokens = async (userId: number) => {
  await prisma.refreshToken.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });
};

// backward-compat alias
const createToken = createAccessToken;

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

    const token = createAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);

    return res.status(201).json({
      message: "register success",
      token,
      refreshToken,
      user,
      customer,
    });
  } catch (err: any) {
    console.error("Register error:", err);

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

// ====================== REGISTER ADMIN (ใหม่) ======================
export const registerAdmin = async (req: Request, res: Response) => {
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

    const admin = await prisma.user.create({
      data: {
        name,
        tol: tolNorm,
        email: emailNorm,
        password: hashed,
        role: "ADMIN",
      },
    });

    return res.json({ message: "register admin success", admin });

  } catch (err: any) {
    console.error("RegisterAdmin error:", err);
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

    // cleanup expired tokens
    await cleanupExpiredTokens(user.id);

    const token = createAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);

    return res.json({ message: "login success", token, refreshToken, user });
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

    // ❌ ไม่ให้ CUSTOMER เข้า Web CRM
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

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ message: "Google token invalid" });
    }

    const email = payload.email;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(403).json({
        message: "อีเมลนี้ไม่มีอยู่ในระบบ ไม่สามารถเข้าสู่ระบบได้",
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "3h" }
    );

    return res.json({
      message: "Google login success",
      token,
      user,
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

// ====================== REFRESH TOKEN (rotation) ======================
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken: incomingToken } = req.body;
    // backward compat: also accept "token" field
    const tokenValue = incomingToken || req.body.token;

    if (!tokenValue) {
      return res.status(400).json({ message: "missing refresh token" });
    }

    // 1) ตรวจ JWT signature + expiry
    const secret = process.env.JWT_REFRESH_SECRET || "dev_refresh_secret";
    let decoded: any;
    try {
      decoded = jwt.verify(tokenValue, secret);
    } catch (jwtErr) {
      // ถ้า verify ไม่ผ่าน → ลบ token นี้ออกจาก DB (ถ้ามี)
      await prisma.refreshToken.deleteMany({ where: { token: tokenValue } });
      return res.status(401).json({ message: "refresh token invalid or expired" });
    }

    // 2) ตรวจว่า token อยู่ใน DB จริง (ป้องกัน reuse)
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: tokenValue },
    });

    if (!storedToken) {
      // Token ถูก revoke ไปแล้ว หรือถูกใช้ซ้ำ → revoke ทั้งหมดของ user (security)
      if (decoded.userId) {
        await prisma.refreshToken.deleteMany({
          where: { userId: decoded.userId },
        });
      }
      return res.status(401).json({ message: "refresh token revoked" });
    }

    // 3) ตรวจว่ายังไม่หมดอายุ
    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      return res.status(401).json({ message: "refresh token expired" });
    }

    // 4) ดึง user
    const user = await prisma.user.findUnique({
      where: { id: storedToken.userId },
    });

    if (!user) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      return res.status(401).json({ message: "user not found" });
    }

    // 5) Token rotation: ลบ token เก่า → สร้าง token ใหม่ทั้งคู่
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const newAccessToken = createAccessToken(user);
    const newRefreshToken = await createRefreshToken(user.id);

    return res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user,
    });
  } catch (err) {
    console.error("RefreshToken error:", err);
    return res.status(401).json({ message: "refresh token invalid" });
  }
};

// ====================== LOGOUT ======================
export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken: incomingToken } = req.body;

    if (incomingToken) {
      // ลบ refresh token ออกจาก DB
      await prisma.refreshToken.deleteMany({
        where: { token: incomingToken },
      });
    }

    return res.json({ message: "logout success" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.json({ message: "logout success" });
  }
};
