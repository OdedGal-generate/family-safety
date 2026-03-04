import { useTranslation } from "react-i18next";

function timeLabel(minutes, t) {
  if (minutes === null) return "";
  if (minutes === 0) return t("justNow");
  if (minutes < 60) return t("minutesAgo", { n: minutes });
  return t("hoursAgo", { n: Math.floor(minutes / 60) });
}

function MemberCard({ member }) {
  const { t } = useTranslation();

  const statusColor =
    member.status === "safe"
      ? "text-accent-green"
      : member.status === "sos"
        ? "text-accent-red"
        : "text-[#94a3b8]";

  const borderColor =
    member.status === "safe"
      ? "border-[rgba(34,197,94,0.15)]"
      : member.status === "sos"
        ? "border-red-border"
        : "border-border-subtle";

  const statusText =
    member.status === "safe"
      ? t("safeStatus")
      : member.status === "sos"
        ? t("sosStatus")
        : t("pendingStatus");

  return (
    <div
      className={`flex items-center gap-3 px-3.5 py-3 rounded-[14px] mb-2 bg-bg-card border transition-all duration-300 ${borderColor}`}
    >
      <div className="text-[26px] shrink-0">{member.emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{member.name}</div>
        <div className="text-[11px] text-text-secondary">
          {t(`memberRoles.${member.role}`)}
          {member.location && ` · ${member.location}`}
        </div>
      </div>
      <div className="text-end">
        <div className={`text-xs font-bold ${statusColor}`}>{statusText}</div>
        {member.time !== null && (
          <div className="text-[10px] text-text-muted">
            {timeLabel(member.time, t)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MembersList({ members, onInviteClick }) {
  const { t } = useTranslation();

  return (
    <div className="px-4 pt-2">
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[13px] font-semibold text-text-secondary">
          {t("myFamily")}
        </div>
        <button
          onClick={onInviteClick}
          className="px-3 py-1.5 rounded-lg bg-[rgba(96,165,250,0.15)] border border-blue-border text-accent-blue text-[11px] font-semibold cursor-pointer hover:bg-[rgba(96,165,250,0.25)] transition-all"
        >
          + {t("inviteFamily")}
        </button>
      </div>
      {members.map((member) => (
        <MemberCard key={member.id} member={member} />
      ))}
    </div>
  );
}
