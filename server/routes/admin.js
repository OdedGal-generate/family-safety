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

// GET /api/admin/groups — list all groups with owner info and member count
router.get("/groups", (req, res) => {
  const groups = db
    .prepare(
      `SELECT
        g.id,
        g.name,
        g.type,
        g.created_at,
        u.id AS owner_id,
        u.name AS owner_name,
        u.phone AS owner_phone,
        (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) AS member_count
      FROM groups g
      JOIN users u ON u.id = g.owner_id
      ORDER BY g.id`
    )
    .all();
  res.json({ count: groups.length, groups });
});

// GET /api/admin/groups/:id/members — members with latest status
router.get("/groups/:id/members", (req, res) => {
  const groupId = Number(req.params.id);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return res.status(400).json({ error: "Invalid group ID" });
  }

  const group = db.prepare("SELECT id, name FROM groups WHERE id = ?").get(groupId);
  if (!group) {
    return res.status(404).json({ error: "Group not found" });
  }

  const members = db
    .prepare(
      `SELECT
        u.id,
        u.name,
        u.phone,
        gm.role,
        gm.joined_at,
        su.status AS latest_status,
        su.timestamp AS last_seen
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      LEFT JOIN status_updates su ON su.id = (
        SELECT s2.id FROM status_updates s2
        WHERE s2.user_id = u.id AND s2.group_id = gm.group_id
        ORDER BY s2.timestamp DESC LIMIT 1
      )
      WHERE gm.group_id = ?
      ORDER BY gm.role ASC, gm.joined_at ASC`
    )
    .all(groupId);

  res.json({ group, members });
});

// DELETE /api/admin/groups/:groupId/members/:userId — remove member from group
router.delete("/groups/:groupId/members/:userId", (req, res) => {
  const groupId = Number(req.params.groupId);
  const userId = Number(req.params.userId);
  if (
    !Number.isInteger(groupId) ||
    !Number.isInteger(userId) ||
    groupId <= 0 ||
    userId <= 0
  ) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const membership = db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, userId);

  if (!membership) {
    return res.status(404).json({ error: "Member not found in this group" });
  }

  db.prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?").run(
    groupId,
    userId
  );
  res.json({ removed: { groupId, userId } });
});

export default router;
