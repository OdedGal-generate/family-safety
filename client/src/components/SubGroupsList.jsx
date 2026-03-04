import { useState } from "react";
import { useTranslation } from "react-i18next";

function SubMemberRow({ member }) {
  const { t } = useTranslation();

  const statusColor =
    member.status === "safe" ? "text-accent-green" : "text-[#94a3b8]";
  const statusText =
    member.status === "safe" ? t("safeStatus") : t("pendingStatus");

  let timeText = "";
  if (member.time === 0) timeText = t("justNow");
  else if (member.time != null && member.time < 60)
    timeText = t("minutesAgo", { n: member.time });
  else if (member.time != null)
    timeText = t("hoursAgo", { n: Math.floor(member.time / 60) });

  return (
    <div className="flex items-center gap-2.5 py-2 px-3 rounded-[10px] bg-[rgba(255,255,255,0.02)]">
      <div className="text-lg shrink-0">{member.emoji}</div>
      <div className="flex-1 min-w-0 text-[13px] font-medium">
        {member.name}
      </div>
      <div className="text-end">
        <div className={`text-[11px] font-bold ${statusColor}`}>
          {statusText}
        </div>
        {timeText && (
          <div className="text-[10px] text-text-muted">{timeText}</div>
        )}
      </div>
    </div>
  );
}

function SubGroupCard({ group }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const safeCount = group.members.filter((m) => m.status === "safe").length;
  const total = group.members.length;
  const allSafe = safeCount === total;

  return (
    <div className="mb-2">
      {/* Card header — clickable */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-[14px] bg-bg-card border cursor-pointer transition-all duration-300 ${
          expanded
            ? "rounded-b-none border-b-0"
            : ""
        } ${
          allSafe
            ? "border-[rgba(34,197,94,0.15)]"
            : "border-yellow-border"
        }`}
      >
        <div className="text-[26px] shrink-0">{group.emoji}</div>
        <div className="flex-1 min-w-0 text-start">
          <div className="text-sm font-semibold text-text-primary">
            {group.name}
          </div>
          <div className="text-[11px] text-text-secondary">
            {total} {t("members")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`text-xs font-bold px-2 py-0.5 rounded-md ${
              allSafe
                ? "bg-green-bg-strong text-accent-green"
                : "bg-yellow-bg text-accent-yellow"
            }`}
          >
            {safeCount}/{total}
          </div>
          <div
            className={`text-text-secondary text-xs transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          >
            ▾
          </div>
        </div>
      </button>

      {/* Expanded members list */}
      {expanded && (
        <div
          className={`px-3 pb-3 pt-1 rounded-b-[14px] bg-bg-card border border-t-0 flex flex-col gap-1 ${
            allSafe
              ? "border-[rgba(34,197,94,0.15)]"
              : "border-yellow-border"
          }`}
        >
          {group.members.map((member) => (
            <SubMemberRow key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SubGroupsList({ subGroups }) {
  const { t } = useTranslation();

  return (
    <div className="px-4 pt-4">
      <div className="text-[13px] font-semibold text-text-secondary mb-2.5">
        {t("subGroups")}
      </div>
      {subGroups.map((group) => (
        <SubGroupCard key={group.id} group={group} />
      ))}
    </div>
  );
}
