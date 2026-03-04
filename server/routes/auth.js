import { Router } from "express";
import db from "../db/index.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { validate, schemas } from "../middleware/validate.js";

const router = Router();

// POST /api/auth/enter — single endpoint: auto-register or auto-login by phone
router.post("/enter", validate(schemas.enter), (req, res) => {
  const { name, phone } = req.body;

  const existing = db
    .prepare("SELECT id, name, phone, avatar_emoji FROM users WHERE phone = ?")
    .get(phone);

  if (existing) {
    // Phone exists → auto-login (ignore name)
    const token = signToken(existing.id);
    return res.json({ user: existing, token, isNew: false });
  }

  // Phone not found → auto-register
  const result = db
    .prepare("INSERT INTO users (name, phone) VALUES (?, ?)")
    .run(name, phone);

  const user = db
    .prepare("SELECT id, name, phone, avatar_emoji FROM users WHERE id = ?")
    .get(result.lastInsertRowid);

  const token = signToken(user.id);
  res.status(201).json({ user, token, isNew: true });
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
