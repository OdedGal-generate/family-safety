import { Router } from "express";
import { body, validationResult } from "express-validator";
import db from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// POST /api/push/subscribe — save push subscription
router.post(
  "/subscribe",
  requireAuth,
  [
    body("endpoint").notEmpty().withMessage("Endpoint required"),
    body("keys.p256dh").notEmpty().withMessage("p256dh key required"),
    body("keys.auth").notEmpty().withMessage("auth key required"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { endpoint, keys } = req.body;

    db.prepare(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET
         user_id = excluded.user_id,
         p256dh = excluded.p256dh,
         auth = excluded.auth`
    ).run(req.userId, endpoint, keys.p256dh, keys.auth);

    res.json({ success: true });
  }
);

// GET /api/push/vapid-key — return public VAPID key
router.get("/vapid-key", (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return res.status(503).json({ error: "Push notifications not configured" });
  }
  res.json({ vapidPublicKey: key });
});

export default router;
