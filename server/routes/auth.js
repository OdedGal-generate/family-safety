import { Router } from "express";
import bcrypt from "bcryptjs";
import db from "../db/index.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { validate, schemas } from "../middleware/validate.js";

const router = Router();
const SALT_ROUNDS = 10;

// POST /api/auth/register — create new user with name + phone + PIN
router.post("/register", validate(schemas.register), async (req, res) => {
  const { name, phone, pin } = req.body;

  // Check if phone already exists
  const existing = db
    .prepare("SELECT id FROM users WHERE phone = ?")
    .get(phone);

  if (existing) {
    return res.status(409).json({ error: "Phone number already registered" });
  }

  const pin_hash = await bcrypt.hash(pin, SALT_ROUNDS);

  const result = db
    .prepare(
      "INSERT INTO users (name, phone, pin_hash) VALUES (?, ?, ?)"
    )
    .run(name, phone, pin_hash);

  const user = db
    .prepare("SELECT id, name, phone, avatar_emoji FROM users WHERE id = ?")
    .get(result.lastInsertRowid);

  const token = signToken(user.id);
  res.status(201).json({ user, token });
});

// POST /api/auth/login — authenticate with phone + PIN
router.post("/login", validate(schemas.login), async (req, res) => {
  const { phone, pin } = req.body;

  const user = db
    .prepare("SELECT id, name, phone, avatar_emoji, pin_hash FROM users WHERE phone = ?")
    .get(phone);

  if (!user || !user.pin_hash) {
    return res.status(401).json({ error: "Invalid phone number or PIN" });
  }

  const valid = await bcrypt.compare(pin, user.pin_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid phone number or PIN" });
  }

  const token = signToken(user.id);
  // Don't leak pin_hash to client
  const { pin_hash, ...safeUser } = user;
  res.json({ user: safeUser, token });
});

// POST /api/auth/profile — update profile (name/avatar) after auth
router.post("/profile", requireAuth, validate(schemas.profile), (req, res) => {
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
