import { Router } from "express";
import prisma from "../config/prismaclient";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { token, userId, customerId } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Push token is required" });
    }

    let finalUserId = userId ? Number(userId) : null;
    let finalCustomerId = customerId ? Number(customerId) : null;

    if (finalUserId && !finalCustomerId) {
      // Check if this User has the CUSTOMER role
      const user = await prisma.user.findUnique({
        where: { id: finalUserId },
        select: { role: true }
      });

      if (user?.role === "CUSTOMER") {
        // Retrieve the corresponding Customer ID
        const customer = await prisma.customer.findFirst({
          where: { userId: finalUserId },
          select: { id: true }
        });
        if (customer) {
          finalCustomerId = customer.id;
        }
      }
    }

    // Upsert the token to associate it with the user or customer
    const pushToken = await prisma.pushToken.upsert({
      where: { token },
      update: {
        userId: finalUserId,
        customerId: finalCustomerId,
      },
      create: {
        token,
        userId: finalUserId,
        customerId: finalCustomerId,
      },
    });

    return res.status(200).json({ ok: true, data: pushToken });
  } catch (error: any) {
    console.error("Error registering push token:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

export default router;
