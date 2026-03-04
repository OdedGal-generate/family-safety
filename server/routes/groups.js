import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import db from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";
import { notifyUser } from "../services/push.js";

const router = Router();

// POST /api/groups — create group, creator becomes owner
router.post(
  "/",
  requireAuth,
  [
    body("name").trim().notEmpty().withMessage("Group name is required"),
    body("parent_group_id").optional().isInt(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, parent_group_id } = req.body;
    let type = "family";
    let depth = 0;

    if (parent_group_id) {
      const parent = db
        .prepare("SELECT id, depth_level FROM groups WHERE id = ?")
        .get(parent_group_id);
      if (!parent) {
        return res.status(404).json({ error: "Parent group not found" });
      }
      type = "sub";
      depth = parent.depth_level + 1;
    }

    const result = db
      .prepare(
        "INSERT INTO groups (name, type, owner_id, parent_group_id, depth_level) VALUES (?, ?, ?, ?, ?)"
      )
      .run(name, type, req.userId, parent_group_id || null, depth);

    const groupId = result.lastInsertRowid;

    // Add creator as owner
    db.prepare(
      "INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'owner')"
    ).run(groupId, req.userId);

    const group = db
      .prepare("SELECT * FROM groups WHERE id = ?")
      .get(groupId);

    res.status(201).json({ group });
  }
);

// POST /api/groups/:id/invite — generate 6-digit code + UUID token
router.post(
  "/:id/invite",
  requireAuth,
  [param("id").isInt()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const groupId = Number(req.params.id);

    // Verify user is owner or admin of the group
    const membership = db
      .prepare(
        "SELECT role FROM group_members WHERE group_id = ? AND user_id = ?"
      )
      .get(groupId, req.userId);

    if (!membership || membership.role === "member") {
      return res
        .status(403)
        .json({ error: "Only owners and admins can create invites" });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const formattedCode = code.slice(0, 3) + "-" + code.slice(3);
    const token = uuidv4();

    db.prepare(
      "INSERT INTO group_invites (group_id, code, token, role, max_uses, expires_at, created_by) VALUES (?, ?, ?, 'member', 10, datetime('now', '+24 hours'), ?)"
    ).run(groupId, formattedCode, token, req.userId);

    res.status(201).json({
      code: formattedCode,
      token,
      expires_in: "24 hours",
    });
  }
);

// POST /api/groups/join — submit join request with code
router.post(
  "/join",
  requireAuth,
  [
    body("code").trim().notEmpty().withMessage("Invite code is required"),
    body("display_name").trim().notEmpty().withMessage("Name is required"),
    body("phone").trim().notEmpty().withMessage("Phone is required"),
    body("self_description").optional().trim(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code, display_name, phone, self_description } = req.body;

    // Find valid invite
    const invite = db
      .prepare(
        "SELECT * FROM group_invites WHERE code = ? AND expires_at > datetime('now') AND use_count < max_uses"
      )
      .get(code);

    if (!invite) {
      return res
        .status(404)
        .json({ error: "Invalid or expired invite code" });
    }

    // Check if already a member
    const existingMember = db
      .prepare(
        "SELECT id FROM group_members WHERE group_id = ? AND user_id = ?"
      )
      .get(invite.group_id, req.userId);

    if (existingMember) {
      return res
        .status(409)
        .json({ error: "You are already a member of this group" });
    }

    // Check for existing pending request
    const existingRequest = db
      .prepare(
        "SELECT id FROM group_member_requests WHERE group_id = ? AND user_id = ? AND status = 'pending'"
      )
      .get(invite.group_id, req.userId);

    if (existingRequest) {
      return res
        .status(409)
        .json({ error: "You already have a pending request for this group" });
    }

    // Create join request
    const result = db
      .prepare(
        "INSERT INTO group_member_requests (group_id, user_id, display_name, phone, self_description) VALUES (?, ?, ?, ?, ?)"
      )
      .run(
        invite.group_id,
        req.userId,
        display_name,
        phone,
        self_description || null
      );

    // Increment invite use count
    db.prepare(
      "UPDATE group_invites SET use_count = use_count + 1 WHERE id = ?"
    ).run(invite.id);

    res.status(201).json({
      request_id: result.lastInsertRowid,
      status: "pending",
      group_id: invite.group_id,
    });
  }
);

// GET /api/groups/:id/requests — list pending requests
router.get(
  "/:id/requests",
  [param("id").isInt()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const groupId = Number(req.params.id);

    const requests = db
      .prepare(
        `SELECT gmr.*, u.avatar_emoji
         FROM group_member_requests gmr
         JOIN users u ON u.id = gmr.user_id
         WHERE gmr.group_id = ?
         ORDER BY gmr.requested_at DESC`
      )
      .all(groupId);

    res.json({ requests });
  }
);

// PATCH /api/groups/:id/requests/:reqId — approve or reject
router.patch(
  "/:id/requests/:reqId",
  requireAuth,
  [
    param("id").isInt(),
    param("reqId").isInt(),
    body("status")
      .isIn(["approved", "rejected"])
      .withMessage("Status must be approved or rejected"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const groupId = Number(req.params.id);
    const reqId = Number(req.params.reqId);
    const { status } = req.body;

    // Verify reviewer is owner or admin
    const membership = db
      .prepare(
        "SELECT role FROM group_members WHERE group_id = ? AND user_id = ?"
      )
      .get(groupId, req.userId);

    if (!membership || membership.role === "member") {
      return res
        .status(403)
        .json({ error: "Only owners and admins can review requests" });
    }

    // Get the request
    const request = db
      .prepare(
        "SELECT * FROM group_member_requests WHERE id = ? AND group_id = ?"
      )
      .get(reqId, groupId);

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.status !== "pending") {
      return res
        .status(409)
        .json({ error: "Request has already been reviewed" });
    }

    const updateRequest = db.transaction(() => {
      // Update request status
      db.prepare(
        "UPDATE group_member_requests SET status = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?"
      ).run(status, req.userId, reqId);

      // If approved, add user as member
      if (status === "approved") {
        db.prepare(
          "INSERT OR IGNORE INTO group_members (group_id, user_id, role, nickname) VALUES (?, ?, 'member', ?)"
        ).run(groupId, request.user_id, request.display_name);
      }
    });

    updateRequest();

    const updated = db
      .prepare("SELECT * FROM group_member_requests WHERE id = ?")
      .get(reqId);

    // Notify requester if approved
    if (status === "approved") {
      const group = db
        .prepare("SELECT name FROM groups WHERE id = ?")
        .get(groupId);
      notifyUser(request.user_id, {
        title: "✅ Approved!",
        body: `You've been approved to join ${group?.name || "the group"}`,
        tag: `approved-${groupId}`,
      }).catch(() => {});
    }

    res.json({ request: updated });
  }
);

export default router;
