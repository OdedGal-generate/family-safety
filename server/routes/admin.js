import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { generateSecret, verifySync, generateURI } from "otplib";
import QRCode from "qrcode";
import db from "../db/index.js";

const router = Router();
const ADMIN_SECRET = (process.env.JWT_SECRET || "") + "_admin";
const SALT_ROUNDS = 10;

// ── Helper: sign admin JWT (1 hour) ──
function signAdminToken() {
  return jwt.sign({ admin: true }, ADMIN_SECRET, { expiresIn: "1h" });
}

// ── Middleware: require admin JWT ──
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    jwt.verify(auth.slice(7), ADMIN_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

// ══════════════════════════════════════════
// PUBLIC: Login (no auth required)
// ══════════════════════════════════════════

router.post("/login", async (req, res) => {
  const { password, totp_code } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  const settings = db.prepare("SELECT * FROM admin_settings WHERE id = 1").get();
  if (!settings) {
    return res.status(500).json({ error: "Admin not configured" });
  }

  const valid = await bcrypt.compare(password, settings.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid password" });
  }

  // Check 2FA
  if (settings.totp_enabled && settings.totp_secret) {
    if (!totp_code) {
      return res.json({ requires2FA: true });
    }
    const totpResult = verifySync({ token: totp_code, secret: settings.totp_secret });
    const totpValid = totpResult.valid;
    if (!totpValid) {
      return res.status(401).json({ error: "Invalid 2FA code" });
    }
  }

  const token = signAdminToken();
  res.json({ token });
});

// ══════════════════════════════════════════
// PROTECTED: All routes below require admin JWT
// ══════════════════════════════════════════

router.use(requireAdmin);

// ── GET /api/admin/settings — admin config (no secrets) ──
router.get("/settings", (req, res) => {
  const settings = db
    .prepare("SELECT totp_enabled FROM admin_settings WHERE id = 1")
    .get();
  res.json({ totp_enabled: !!settings?.totp_enabled });
});

// ── POST /api/admin/change-password ──
router.post("/change-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Both current and new password required" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  const settings = db.prepare("SELECT password_hash FROM admin_settings WHERE id = 1").get();
  const valid = await bcrypt.compare(currentPassword, settings.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  db.prepare("UPDATE admin_settings SET password_hash = ?, updated_at = datetime('now') WHERE id = 1").run(hash);
  res.json({ success: true });
});

// ── POST /api/admin/2fa/setup — generate TOTP secret + QR code ──
router.post("/2fa/setup", async (req, res) => {
  const secret = generateSecret();
  const uri = generateURI({ label: "admin", issuer: "FamilyShield", secret, type: "totp" });
  const qrCode = await QRCode.toDataURL(uri);

  // Store secret but don't enable yet (user must verify first)
  db.prepare("UPDATE admin_settings SET totp_secret = ?, updated_at = datetime('now') WHERE id = 1").run(secret);

  res.json({ qrCode, secret });
});

// ── POST /api/admin/2fa/verify — verify code and enable 2FA ──
router.post("/2fa/verify", (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: "Code is required" });
  }

  const settings = db.prepare("SELECT totp_secret FROM admin_settings WHERE id = 1").get();
  if (!settings?.totp_secret) {
    return res.status(400).json({ error: "2FA not set up. Call /2fa/setup first" });
  }

  const verifyResult = verifySync({ token: code, secret: settings.totp_secret });
  const valid = verifyResult.valid;
  if (!valid) {
    return res.status(401).json({ error: "Invalid code. Try again." });
  }

  db.prepare("UPDATE admin_settings SET totp_enabled = 1, updated_at = datetime('now') WHERE id = 1").run();
  res.json({ success: true });
});

// ── POST /api/admin/2fa/disable — disable 2FA (requires password) ──
router.post("/2fa/disable", async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  const settings = db.prepare("SELECT password_hash FROM admin_settings WHERE id = 1").get();
  const valid = await bcrypt.compare(password, settings.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid password" });
  }

  db.prepare("UPDATE admin_settings SET totp_enabled = 0, totp_secret = NULL, updated_at = datetime('now') WHERE id = 1").run();
  res.json({ success: true });
});

// ══════════════════════════════════════════
// EXISTING: Data management endpoints
// ══════════════════════════════════════════

// GET /api/admin/users — list all users
router.get("/users", (req, res) => {
  const users = db
    .prepare("SELECT id, name, phone, avatar_emoji, created_at FROM users ORDER BY id")
    .all();
  res.json({ count: users.length, users });
});

// DELETE /api/admin/users/phone/:phone
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

// DELETE /api/admin/users/:id
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

// GET /api/admin/groups
router.get("/groups", (req, res) => {
  const groups = db
    .prepare(
      `SELECT
        g.id, g.name, g.type, g.created_at,
        u.id AS owner_id, u.name AS owner_name, u.phone AS owner_phone,
        (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) AS member_count
      FROM groups g
      JOIN users u ON u.id = g.owner_id
      ORDER BY g.id`
    )
    .all();
  res.json({ count: groups.length, groups });
});

// GET /api/admin/groups/:id/members
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
        u.id, u.name, u.phone, gm.role, gm.joined_at,
        su.status AS latest_status, su.timestamp AS last_seen
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

// DELETE /api/admin/groups/:groupId/members/:userId
router.delete("/groups/:groupId/members/:userId", (req, res) => {
  const groupId = Number(req.params.groupId);
  const userId = Number(req.params.userId);
  if (!Number.isInteger(groupId) || !Number.isInteger(userId) || groupId <= 0 || userId <= 0) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const membership = db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, userId);

  if (!membership) {
    return res.status(404).json({ error: "Member not found in this group" });
  }

  db.prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?").run(groupId, userId);
  res.json({ removed: { groupId, userId } });
});

export default router;
