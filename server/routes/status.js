import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import db from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";
import { notifyGroup } from "../services/push.js";

const router = Router();

// POST /api/status — post "I'm safe" with optional lat/lng
router.post(
  "/",
  requireAuth,
  [
    body("group_id").isInt().withMessage("group_id is required"),
    body("status")
      .isIn(["safe", "need_help", "sos"])
      .withMessage("Status must be safe, need_help, or sos"),
    body("lat").optional().isFloat(),
    body("lng").optional().isFloat(),
    body("address").optional().trim(),
    body("message").optional().trim(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { group_id, status, lat, lng, address, message } = req.body;

    // Verify user is a member of the group
    const membership = db
      .prepare(
        "SELECT id FROM group_members WHERE group_id = ? AND user_id = ?"
      )
      .get(group_id, req.userId);

    if (!membership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group" });
    }

    const result = db
      .prepare(
        "INSERT INTO status_updates (user_id, group_id, status, lat, lng, address, message) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        req.userId,
        group_id,
        status,
        lat || null,
        lng || null,
        address || null,
        message || null
      );

    const update = db
      .prepare("SELECT * FROM status_updates WHERE id = ?")
      .get(result.lastInsertRowid);

    // Fire-and-forget push notification
    const user = db
      .prepare("SELECT name FROM users WHERE id = ?")
      .get(req.userId);
    const userName = user?.name || "Someone";

    if (status === "safe") {
      notifyGroup(group_id, req.userId, {
        title: "✅ Safe",
        body: `${userName} is safe`,
        tag: `safe-${req.userId}`,
      }).catch(() => {});
    } else if (status === "sos") {
      notifyGroup(group_id, req.userId, {
        title: "🆘 Emergency",
        body: `${userName} needs help!`,
        tag: `sos-${req.userId}`,
        requireInteraction: true,
      }).catch(() => {});
    }

    res.status(201).json({ status_update: update });
  }
);

// GET /api/groups/:id/status — get all members' latest status
router.get(
  "/groups/:id",
  [param("id").isInt()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const groupId = Number(req.params.id);

    // Verify group exists
    const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Get all members with their latest status
    const members = db
      .prepare(
        `SELECT
           u.id, u.name, u.phone, u.avatar_emoji,
           gm.role, gm.nickname,
           su.status AS latest_status,
           su.lat, su.lng, su.address,
           su.message, su.timestamp AS last_update
         FROM group_members gm
         JOIN users u ON u.id = gm.user_id
         LEFT JOIN status_updates su ON su.id = (
           SELECT s2.id FROM status_updates s2
           WHERE s2.user_id = u.id AND s2.group_id = gm.group_id
           ORDER BY s2.timestamp DESC LIMIT 1
         )
         WHERE gm.group_id = ?
         ORDER BY gm.joined_at ASC`
      )
      .all(groupId);

    // Get sub-groups if this is a top-level group
    const subGroups = db
      .prepare("SELECT * FROM groups WHERE parent_group_id = ?")
      .all(groupId);

    const subGroupsWithStatus = subGroups.map((sg) => {
      const sgMembers = db
        .prepare(
          `SELECT
             u.id, u.name, u.avatar_emoji,
             su.status AS latest_status,
             su.timestamp AS last_update
           FROM group_members gm
           JOIN users u ON u.id = gm.user_id
           LEFT JOIN status_updates su ON su.id = (
             SELECT s2.id FROM status_updates s2
             WHERE s2.user_id = u.id AND s2.group_id = gm.group_id
             ORDER BY s2.timestamp DESC LIMIT 1
           )
           WHERE gm.group_id = ?`
        )
        .all(sg.id);

      const safeCount = sgMembers.filter(
        (m) => m.latest_status === "safe"
      ).length;

      return {
        ...sg,
        members: sgMembers,
        safe_count: safeCount,
        total_count: sgMembers.length,
      };
    });

    const safeCount = members.filter(
      (m) => m.latest_status === "safe"
    ).length;

    res.json({
      group,
      members,
      safe_count: safeCount,
      total_count: members.length,
      sub_groups: subGroupsWithStatus,
    });
  }
);

export default router;
