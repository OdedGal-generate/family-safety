import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePendingRequests, useReviewRequest } from "../api/hooks";
import { subscribeToPush } from "../services/pushNotifications";

const LANGUAGES = ["he", "en", "ar", "fr"];

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const [locationOn, setLocationOn] = useState(true);
  const [notificationsOn, setNotificationsOn] = useState(
    () => typeof Notification !== "undefined" && Notification.permission === "granted"
  );
  const [joinMode, setJoinMode] = useState("manual"); // "manual" | "auto"

  const { data: pendingRequests = [], isLoading } = usePendingRequests();
  const reviewRequest = useReviewRequest();

  // Track local decisions for instant UI feedback
  const [decisions, setDecisions] = useState({});

  const handleApprove = (id) => {
    setDecisions((prev) => ({ ...prev, [id]: "approved" }));
    reviewRequest.mutate({ reqId: id, status: "approved" });
  };

  const handleReject = (id) => {
    setDecisions((prev) => ({ ...prev, [id]: "rejected" }));
    reviewRequest.mutate({ reqId: id, status: "rejected" });
  };

  const undecidedCount = pendingRequests.filter(
    (r) => r.status === "pending" && !decisions[r.id]
  ).length;

  return (
    <div className="p-4">
      <div className="text-[13px] font-semibold text-text-secondary mb-2.5">
        {t("settings")}
      </div>

      {/* Location sharing */}
      <SettingCard
        icon="📍"
        label={t("settingsItems.locationSharing.label")}
        onClick={() => setLocationOn(!locationOn)}
      >
        <span style={{ color: locationOn ? "#22c55e" : "#94a3b8" }}>
          {locationOn ? t("active") : t("inactive")}
        </span>
      </SettingCard>

      {/* Notifications */}
      <SettingCard
        icon="🔔"
        label={t("settingsItems.notifications.label")}
        onClick={async () => {
          if (!notificationsOn) {
            const ok = await subscribeToPush().catch(() => false);
            setNotificationsOn(ok);
          } else {
            setNotificationsOn(false);
          }
        }}
      >
        <span
          style={{ color: notificationsOn ? "#22c55e" : "#94a3b8" }}
        >
          {notificationsOn ? t("active") : t("inactive")}
        </span>
      </SettingCard>

      {/* Language selector */}
      <div className="p-3.5 px-4 rounded-[14px] mb-2 bg-bg-card border border-border-subtle flex items-center gap-3">
        <div className="text-xl">🌐</div>
        <div className="flex-1 text-sm">
          {t("settingsItems.language.label")}
        </div>
        <div className="flex gap-1">
          {LANGUAGES.map((lng) => (
            <button
              key={lng}
              onClick={() => i18n.changeLanguage(lng)}
              className={`px-2 py-1 rounded-md border-none cursor-pointer text-[11px] font-semibold transition-all ${
                i18n.language === lng
                  ? "bg-[rgba(96,165,250,0.2)] text-accent-blue"
                  : "bg-[rgba(255,255,255,0.05)] text-text-secondary"
              }`}
            >
              {lng.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Group settings (static) */}
      <SettingCard icon="👥" label={t("settingsItems.groupSettings.label")}>
        <span style={{ color: "#94a3b8" }}>›</span>
      </SettingCard>

      {/* Join approval */}
      <div className="p-3.5 px-4 rounded-[14px] mb-2 bg-bg-card border border-border-subtle flex items-center gap-3">
        <div className="text-xl relative">
          🔐
          {undecidedCount > 0 && (
            <span className="absolute -top-1.5 -end-2 min-w-[18px] h-[18px] rounded-full bg-accent-red text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
              {undecidedCount}
            </span>
          )}
        </div>
        <div className="flex-1 text-sm">
          {t("settingsItems.joinApproval.label")}
        </div>
        <div className="flex gap-1">
          {["manual", "auto"].map((mode) => (
            <button
              key={mode}
              onClick={() => setJoinMode(mode)}
              className={`px-2.5 py-1 rounded-md border-none cursor-pointer text-[11px] font-semibold transition-all ${
                joinMode === mode
                  ? "bg-[rgba(245,158,11,0.2)] text-accent-amber"
                  : "bg-[rgba(255,255,255,0.05)] text-text-secondary"
              }`}
            >
              {t(mode)}
            </button>
          ))}
        </div>
      </div>

      {/* Pending requests section */}
      {pendingRequests.length > 0 && (
        <div className="mt-4">
          <div className="text-[13px] font-semibold text-text-secondary mb-2.5">
            {t("pendingRequests")}
          </div>
          {pendingRequests.map((req) => {
            const decision = decisions[req.id] || (req.status !== "pending" ? req.status : null);
            return (
              <div
                key={req.id}
                className="p-3.5 px-4 rounded-[14px] mb-2 bg-bg-card border border-border-subtle flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-lg">
                  {req.avatar_emoji || "👤"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{req.name}</div>
                  <div className="text-[11px] text-text-secondary">
                    {t("wantsToJoin")}
                  </div>
                </div>
                {decision ? (
                  <div
                    className={`text-[12px] font-semibold ${
                      decision === "approved"
                        ? "text-accent-green"
                        : "text-text-muted"
                    }`}
                  >
                    {decision === "approved" ? t("approved") : t("rejected")}
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-[rgba(34,197,94,0.15)] border border-green-border text-accent-green text-[11px] font-semibold cursor-pointer hover:bg-[rgba(34,197,94,0.25)] transition-all"
                    >
                      {t("approve")}
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-[rgba(239,68,68,0.1)] border border-red-border text-accent-red text-[11px] font-semibold cursor-pointer hover:bg-[rgba(239,68,68,0.2)] transition-all"
                    >
                      {t("reject")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SettingCard({ icon, label, children, onClick }) {
  return (
    <div
      className={`p-3.5 px-4 rounded-[14px] mb-2 bg-bg-card border border-border-subtle flex items-center gap-3 ${
        onClick ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
    >
      <div className="text-xl">{icon}</div>
      <div className="flex-1 text-sm">{label}</div>
      <div className="text-[13px] font-semibold">{children}</div>
    </div>
  );
}
