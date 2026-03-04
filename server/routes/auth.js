import { Router } from "express";
import db from "../db/index.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { sendOtp } from "../services/sms.js";
import { validate, schemas } from "../middleware/validate.js";

const router = Router();

// POST /api/auth/send-otp — generate OTP and send via SMS (or log in mock mode)
router.post("/send-otp", validate(schemas.sendOtp), async (req, res) => {
  const { phone } = req.body;

  // Invalidate previous unused codes for this phone
  db.prepare("UPDATE otp_codes SET used = 1 WHERE phone = ? AND used = 0").run(phone);

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));

  // Save with 10-minute expiry
  db.prepare(
    "INSERT INTO otp_codes (phone, code, expires_at) VALUES (?, ?, datetime('now', '+10 minutes'))"
  ).run(phone, code);

  // Send via Twilio or log in mock mode
  const result = await sendOtp(phone, code);

  res.json({ success: true, mock: result.mock });
});

// POST /api/auth/verify-otp — verify OTP code, return JWT
router.post("/verify-otp", validate(schemas.verifyOtp), (req, res) => {
  const { phone, code } = req.body;

  // Find valid OTP
  const otp = db
    .prepare(
      "SELECT * FROM otp_codes WHERE phone = ? AND code = ? AND used = 0 AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1"
    )
    .get(phone, code);

  if (!otp) {
    return res.status(401).json({ error: "Invalid or expired code" });
  }

  // Mark as used
  db.prepare("UPDATE otp_codes SET used = 1 WHERE id = ?").run(otp.id);

  // Find or create user
  let user = db
    .prepare("SELECT id, name, phone, avatar_emoji FROM users WHERE phone = ?")
    .get(phone);

  let isNew = false;
  if (!user) {
    const result = db
      .prepare("INSERT INTO users (name, phone) VALUES ('', ?)")
      .run(phone);
    user = db
      .prepare("SELECT id, name, phone, avatar_emoji FROM users WHERE id = ?")
      .get(result.lastInsertRowid);
    isNew = true;
  } else if (!user.name) {
    isNew = true;
  }

  const token = signToken(user.id);
  res.json({ user, token, isNew });
});

// POST /api/auth/register — update profile (name/avatar) after OTP verification
router.post("/register", requireAuth, validate(schemas.register), (req, res) => {
  const { name, avatar_emoji } = req.body;

  db.prepare("UPDATE users SET name = ?, avatar_emoji = ? WHERE id = ?").run(
    name,
    avatar_emoji || "👤",
    req.userId
  );

  const user = db
    .prepare("SELECT id, name, phone, avatar_emoji FROM users WHERE id = ?")
    .get(req.userId);

  const token = signToken(user.id);
  res.json({ user, token });
});

export default router;
