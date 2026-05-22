import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { verifyRoles } from "../middlewares/verifyRoles";
import { getAboutTeam, upsertAboutTeam } from "../controller/settingController";

const router = Router();

/** GET /api/settings/about-team — ทุก role ที่ login แล้วดูได้ */
router.get("/about-team", authMiddleware, getAboutTeam);

/** PUT /api/settings/about-team — เฉพาะ ADMIN เท่านั้น */
router.put("/about-team", authMiddleware, verifyRoles("ADMIN"), upsertAboutTeam);

export default router;
