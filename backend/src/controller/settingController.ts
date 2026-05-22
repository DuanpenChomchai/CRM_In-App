import { Response } from "express";
import prisma from "../config/prismaclient";
import { AuthRequest } from "../middlewares/authMiddleware";

const ABOUT_TEAM_KEY = "about_team";

/** GET /api/settings/about-team — ดึงข้อมูลทีม (ทุก role ดูได้) */
export const getAboutTeam = async (_req: AuthRequest, res: Response) => {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: ABOUT_TEAM_KEY },
    });

    if (!setting) {
      // ยังไม่มีข้อมูลในฐานข้อมูล → ส่ง null ให้ frontend ใช้ default
      return res.json({ data: null });
    }

    return res.json({ data: JSON.parse(setting.value) });
  } catch (err) {
    console.error("getAboutTeam error:", err);
    return res.status(500).json({ message: "ดึงข้อมูลทีมล้มเหลว" });
  }
};

/** PUT /api/settings/about-team — บันทึก/อัปเดตข้อมูลทีม (ADMIN เท่านั้น) */
export const upsertAboutTeam = async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;

    // Validate โครงสร้างคร่าวๆ
    if (!body?.dev1 || !body?.dev2 || !body?.advisor) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน (dev1, dev2, advisor)" });
    }

    const setting = await prisma.appSetting.upsert({
      where: { key: ABOUT_TEAM_KEY },
      update: { value: JSON.stringify(body) },
      create: { key: ABOUT_TEAM_KEY, value: JSON.stringify(body) },
    });

    return res.json({ data: JSON.parse(setting.value) });
  } catch (err) {
    console.error("upsertAboutTeam error:", err);
    return res.status(500).json({ message: "บันทึกข้อมูลทีมล้มเหลว" });
  }
};
