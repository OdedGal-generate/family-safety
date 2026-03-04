import db from "./index.js";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

export function seedDemoData() {
  // Only seed if users table is empty
  const count = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  if (count > 0) return;

  // All demo users get PIN "1234"
  const demoPinHash = bcrypt.hashSync("1234", 10);

  const insertUser = db.prepare(
    "INSERT INTO users (name, phone, avatar_emoji, pin_hash) VALUES (?, ?, ?, ?)"
  );
  const insertGroup = db.prepare(
    "INSERT INTO groups (name, type, owner_id, parent_group_id, depth_level) VALUES (?, ?, ?, ?, ?)"
  );
  const insertMember = db.prepare(
    "INSERT INTO group_members (group_id, user_id, role, nickname) VALUES (?, ?, ?, ?)"
  );
  const insertStatus = db.prepare(
    "INSERT INTO status_updates (user_id, group_id, status, lat, lng, address, timestamp) VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))"
  );
  const insertInvite = db.prepare(
    "INSERT INTO group_invites (group_id, code, token, role, max_uses, expires_at, created_by) VALUES (?, ?, ?, ?, ?, datetime('now', '+24 hours'), ?)"
  );
  const insertRequest = db.prepare(
    "INSERT INTO group_member_requests (group_id, user_id, display_name, phone, self_description, status) VALUES (?, ?, ?, ?, ?, ?)"
  );

  const seed = db.transaction(() => {
    // ── Main family members (matching frontend demoMembers) ──
    const adi = insertUser.run("עדי", "054-1111111", "👩", demoPinHash).lastInsertRowid;
    const yonatan = insertUser.run("יונתן", "054-2222222", "👨", demoPinHash).lastInsertRowid;
    const maya = insertUser.run("מאיה", "054-3333333", "👧", demoPinHash).lastInsertRowid;
    const noam = insertUser.run("נועם", "054-4444444", "👦", demoPinHash).lastInsertRowid;
    const grandpaMoshe = insertUser.run("סבא משה", "054-5555555", "👴", demoPinHash).lastInsertRowid;
    const grandmaRuth = insertUser.run("סבתא רות", "054-6666666", "👵", demoPinHash).lastInsertRowid;

    // ── Sub-group 1 members: משפחת דוד ──
    const david = insertUser.run("דוד", "054-7777777", "👨", demoPinHash).lastInsertRowid;
    const sarah = insertUser.run("שרה", "054-8888888", "👩", demoPinHash).lastInsertRowid;
    const tamar = insertUser.run("תמר", "054-9999999", "👧", demoPinHash).lastInsertRowid;

    // ── Sub-group 2 members: משפחת מיכל ──
    const michal = insertUser.run("מיכל", "054-1010101", "👩", demoPinHash).lastInsertRowid;
    const alon = insertUser.run("אלון", "054-1020202", "👨", demoPinHash).lastInsertRowid;
    const yuval = insertUser.run("יובל", "054-1030303", "👦", demoPinHash).lastInsertRowid;
    const noa = insertUser.run("נועה", "054-1040404", "👧", demoPinHash).lastInsertRowid;
    const omer = insertUser.run("עומר", "054-1050505", "👶", demoPinHash).lastInsertRowid;

    // ── Pending request user ──
    const davidLevi = insertUser.run("David Levi", "054-1060606", "👤", demoPinHash).lastInsertRowid;

    // ── Main group ──
    const mainGroup = insertGroup.run("משפחת כהן", "family", yonatan, null, 0).lastInsertRowid;

    insertMember.run(mainGroup, yonatan, "owner", "אבא");
    insertMember.run(mainGroup, adi, "admin", "אמא");
    insertMember.run(mainGroup, maya, "member", "בת");
    insertMember.run(mainGroup, noam, "member", "בן");
    insertMember.run(mainGroup, grandpaMoshe, "member", "סבא");
    insertMember.run(mainGroup, grandmaRuth, "member", "סבתא");

    // ── Sub-group 1: משפחת דוד (אחי) ──
    const sg1 = insertGroup.run("משפחת דוד (אחי)", "sub", david, mainGroup, 1).lastInsertRowid;
    insertMember.run(sg1, david, "owner", null);
    insertMember.run(sg1, sarah, "admin", null);
    insertMember.run(sg1, tamar, "member", null);

    // ── Sub-group 2: משפחת מיכל (אחות) ──
    const sg2 = insertGroup.run("משפחת מיכל (אחות)", "sub", michal, mainGroup, 1).lastInsertRowid;
    insertMember.run(sg2, michal, "owner", null);
    insertMember.run(sg2, alon, "admin", null);
    insertMember.run(sg2, yuval, "member", null);
    insertMember.run(sg2, noa, "member", null);
    insertMember.run(sg2, omer, "member", null);

    // ── Status updates (matching frontend demo times) ──
    // Main group
    insertStatus.run(adi, mainGroup, "safe", 32.0853, 34.7818, "תל אביב", "-2 minutes");
    insertStatus.run(yonatan, mainGroup, "safe", 32.0680, 34.8241, "רמת גן", "-0 minutes");
    // maya has no status update (pending)
    insertStatus.run(noam, mainGroup, "safe", 32.0842, 34.8878, "פתח תקווה", "-8 minutes");
    insertStatus.run(grandpaMoshe, mainGroup, "safe", 32.0718, 34.8128, "גבעתיים", "-15 minutes");
    insertStatus.run(grandmaRuth, mainGroup, "safe", 32.0718, 34.8128, "גבעתיים", "-15 minutes");

    // Sub-group 1 — all safe
    insertStatus.run(david, sg1, "safe", 32.09, 34.78, null, "-5 minutes");
    insertStatus.run(sarah, sg1, "safe", 32.09, 34.78, null, "-5 minutes");
    insertStatus.run(tamar, sg1, "safe", 32.09, 34.78, null, "-10 minutes");

    // Sub-group 2 — 4 safe, omer pending
    insertStatus.run(michal, sg2, "safe", 32.07, 34.81, null, "-3 minutes");
    insertStatus.run(alon, sg2, "safe", 32.07, 34.81, null, "-3 minutes");
    insertStatus.run(yuval, sg2, "safe", 32.07, 34.81, null, "-12 minutes");
    insertStatus.run(noa, sg2, "safe", 32.07, 34.81, null, "-12 minutes");
    // omer has no status update (pending)

    // ── Demo invite for main group ──
    insertInvite.run(mainGroup, "847-293", uuidv4(), "member", 10, yonatan);

    // ── Pending join request ──
    insertRequest.run(mainGroup, davidLevi, "David Levi", "054-1060606", "חבר של יונתן", "pending");
  });

  seed();
  console.log("Demo data seeded successfully");
}
