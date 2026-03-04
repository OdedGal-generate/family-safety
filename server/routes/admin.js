import { Router } from "express";
import db from "../db/index.js";

const router = Router();
const ADMIN_KEY = "admin-2024";

// Middleware: require x-admin-key header
function requireAdmin(req, res, next) {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

router.use(requireAdmin);

// GET /admin/users — list all users
router.get("/users", (req, res) => {
  const users = db
    .prepare("SELECT id, name, phone, avatar_emoji, created_at FROM users ORDER BY id")
    .all();
  res.json({ count: users.length, users });
});

// DELETE /admin/users/phone/:phone — delete user by phone (must come before :id)
router.delete("/users/phone/:phone", (req, res) => {
  const { phone } = req.params;
  const user = db.prepare("SELECT id, name, phone FROM users WHERE phone = ?").get(phone);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  db.prepare("DELETE FROM group_members WHERE user_id = ?").run(user.id);
  db.prepare("DELETE FROM status_updates WHERE user_id = ?").run(user.id);
  db.prepare("DELETE FROM push_subscriptions WHERE user_id = ?").run(user.id);
  db.prepare("DELETE FROM users WHERE id = ?").run(user.id);

  res.json({ deleted: user });
});

// DELETE /admin/users/:id — delete user by id
router.delete("/users/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  const user = db.prepare("SELECT id, name, phone FROM users WHERE id = ?").get(id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  db.prepare("DELETE FROM group_members WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM status_updates WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM push_subscriptions WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM users WHERE id = ?").run(id);

  res.json({ deleted: user });
});

export default router;
