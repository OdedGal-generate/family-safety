import webpush from "web-push";
import db from "../db/index.js";

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
const isConfigured = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (isConfigured) {
  webpush.setVapidDetails(
    VAPID_SUBJECT || "mailto:admin@familyshield.app",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export async function notifyUser(userId, payload) {
  if (!isConfigured) {
    console.log(`[MOCK PUSH] to user ${userId}:`, payload);
    return;
  }

  const subs = db
    .prepare("SELECT * FROM push_subscriptions WHERE user_id = ?")
    .all(userId);

  const results = await Promise.allSettled(
    subs.map((sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      return webpush.sendNotification(subscription, JSON.stringify(payload));
    })
  );

  results.forEach((result, i) => {
    if (result.status === "rejected" && result.reason?.statusCode === 410) {
      db.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(subs[i].id);
    }
  });
}

export async function notifyGroup(groupId, excludeUserId, payload) {
  const members = db
    .prepare("SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?")
    .all(groupId, excludeUserId);

  await Promise.allSettled(
    members.map((m) => notifyUser(m.user_id, payload))
  );
}
