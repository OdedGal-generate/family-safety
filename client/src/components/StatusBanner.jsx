import { useTranslation } from "react-i18next";

export default function StatusBanner({ members, subGroups = [] }) {
  const { t } = useTranslation();
  const safeCount = members.filter((m) => m.status === "safe").length;
  const allSafe = safeCount === members.length;

  // Extended family totals (main group + all sub-groups)
  const subTotal = subGroups.reduce((sum, g) => sum + g.members.length, 0);
  const subSafe = subGroups.reduce(
    (sum, g) => sum + g.members.filter((m) => m.status === "safe").length,
    0
  );
  const extTotal = members.length + subTotal;
  const extSafe = safeCount + subSafe;

  return (
    <div
      className={`mx-4 mt-4 px-4 py-3 rounded-[14px] flex items-center justify-between transition-all duration-500 border ${
        allSafe
          ? "bg-[linear-gradient(135deg,rgba(34,197,94,0.15),rgba(16,163,74,0.1))] border-green-border"
          : "bg-[linear-gradient(135deg,rgba(234,179,8,0.15),rgba(202,138,4,0.1))] border-yellow-border"
      }`}
    >
      <div>
        <div
          className={`text-[13px] font-bold ${
            allSafe ? "text-accent-green" : "text-accent-yellow"
          }`}
        >
          {allSafe ? t("allSafe") : t("waitingForReports")}
        </div>
        <div className="text-[11px] text-text-secondary mt-0.5">
          {safeCount} {t("of")} {members.length} {t("totalSafe")}
        </div>
        {subGroups.length > 0 && (
          <div className="text-[11px] text-text-secondary mt-0.5">
            {t("extendedFamilySafe", { safe: extSafe, total: extTotal })}
          </div>
        )}
      </div>
      <div className="text-[28px]">{allSafe ? "🟢" : "🟡"}</div>
    </div>
  );
}
