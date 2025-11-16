import { Request, Response } from "express";
import prisma from "../config/prismaclient";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const normalizePhoneTH = (raw: string) => {
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return raw;
  if (digits.length === 10 && digits.startsWith("0")) return `+66${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("66")) return `+${digits}`;
  if (digits.length === 11 && raw.startsWith("+66")) return `+${digits}`;
  return raw;
};

const createToken = (user: any) => {
  const secret = process.env.JWT_SECRET || "dev_secret";
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn: "1d" }
  );
};

// ====================== REGISTER ======================
export const register = async (req: Request, res: Response) => {
  try {
    const { name, tol, email, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        tol: normalizePhoneTH(tol),
        email: email.toLowerCase(),
        password: hashed,
        role: "CUSTOMER",
      },
    });

    res.json({ message: "register success", user });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
};

// ====================== REGISTER SALES ======================
export const registerSales = async (req: Request, res: Response) => {
  try {
    const { name, tol, email, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        tol: normalizePhoneTH(tol),
        email: email.toLowerCase(),
        password: hashed,
        role: "SALE",
      },
    });

    res.json({ message: "register sale success", user });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
};

// ====================== REGISTER MANAGER ======================
export const registerManager = async (req: Request, res: Response) => {
  try {
    const { name, tol, email, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        tol: normalizePhoneTH(tol),
        email: email.toLowerCase(),
        password: hashed,
        role: "MANAGER",
      },
    });

    res.json({ message: "register manager success", user });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
};

// ====================== LOGIN ======================
export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, email, password } = req.body;
    const idRaw = (identifier ?? email) as string;

    const looksLikeEmail = idRaw.includes("@");

    const user = looksLikeEmail
      ? await prisma.user.findUnique({
          where: { email: idRaw.trim().toLowerCase() },
        })
      : await prisma.user.findFirst({
          where: {
            OR: [
              { tol: normalizePhoneTH(idRaw) },
              { tol: idRaw },
            ],
          },
        });

    if (!user) return res.status(404).json({ message: "ไม่พบบัญชีผู้ใช้" });

    // ❗ block CUSTOMER
    if (user.role === "CUSTOMER")
      return res.status(403).json({ message: "บัญชีนี้ไม่มีสิทธิ์เข้าสู่ระบบเว็บ CRM" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "รหัสผ่านผิด!" });

    const token = createToken(user);

    res.json({ message: "login success", token, user });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
};

// ====================== GOOGLE LOGIN ======================
export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) return res.status(400).json({ message: "google login failed" });

    let user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: payload.name || "Google User",
          email: payload.email,
          tol: "",
          password: "",
          role: "CUSTOMER",
        },
      });
    }

    const token = createToken(user);

    res.json({ message: "google login success", token, user });
  } catch (err) {
    res.status(500).json({ message: "server error" });
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
    res.status(500).json({ message: "server error" });
  }
};

// ====================== REFRESH TOKEN ======================
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    const newToken = createToken(user);

    res.json({ token: newToken });
  } catch (err) {
    res.status(401).json({ message: "token invalid" });
  }
};

// ====================== LOGOUT ======================
export const logout = async (req: Request, res: Response) => {
  res.json({ message: "logout success" });
};
