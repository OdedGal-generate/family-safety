import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

const ITEM_KEYS = [
  "water",
  "cannedFood",
  "radio",
  "flashlight",
  "medications",
  "firstAid",
  "documents",
  "cash",
  "powerBank",
  "petFood",
];

export default function ChecklistScreen() {
  const { t } = useTranslation();
  const [checked, setChecked] = useState({});

  const items = useMemo(
    () =>
      ITEM_KEYS.map((key) => ({
        key,
        text: t(`checklistItems.${key}.text`),
        cat: t(`checklistItems.${key}.cat`),
      })),
    [t]
  );

  const checkedCount = Object.values(checked).filter(Boolean).length;
  const total = items.length;
  const pct = Math.round((checkedCount / total) * 100);

  // Group items by category, preserving order
  const grouped = useMemo(() => {
    const groups = [];
    let lastCat = null;
    for (const item of items) {
      if (item.cat !== lastCat) {
        groups.push({ cat: item.cat, items: [] });
        lastCat = item.cat;
      }
      groups[groups.length - 1].items.push(item);
    }
    return groups;
  }, [items]);

  const toggleCheck = (key) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-4">
      {/* Progress header */}
      <div className="flex items-center justify-between p-3.5 px-4 rounded-[14px] mb-4 bg-[linear-gradient(135deg,rgba(59,130,246,0.15),rgba(37,99,235,0.1))] border border-blue-border">
        <div>
          <div className="text-sm font-bold text-accent-blue">
            🏠 {t("shelter")}
          </div>
          <div className="text-[11px] text-text-secondary mt-0.5">
            {checkedCount}/{total}
          </div>
        </div>
        {/* Circular percentage */}
        <div className="w-12 h-12 rounded-full border-[3px] border-[rgba(59,130,246,0.3)] flex items-center justify-center text-[13px] font-bold text-accent-blue">
          {pct}%
        </div>
      </div>

      {/* Grouped checklist items */}
      {grouped.map((group, gi) => (
        <div key={gi}>
          {gi > 0 && (
            <div className="h-px bg-border-subtle my-3" />
          )}
          {group.items.map((item) => {
            const isChecked = !!checked[item.key];
            return (
              <div
                key={item.key}
                onClick={() => toggleCheck(item.key)}
                className={`flex items-center gap-3 py-[13px] px-3.5 rounded-xl mb-1.5 border cursor-pointer transition-all duration-200 ${
                  isChecked
                    ? "bg-[rgba(34,197,94,0.07)] border-[rgba(34,197,94,0.2)] opacity-70"
                    : "bg-[rgba(255,255,255,0.03)] border-border-subtle"
                }`}
              >
                {/* Checkbox */}
                <div
                  className={`w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center text-xs shrink-0 transition-all duration-200 ${
                    isChecked
                      ? "border-accent-green bg-accent-green text-white"
                      : "border-[rgba(255,255,255,0.2)] bg-transparent"
                  }`}
                >
                  {isChecked && "✓"}
                </div>

                {/* Text */}
                <div
                  className={`flex-1 text-sm transition-all duration-200 ${
                    isChecked
                      ? "line-through text-text-secondary"
                      : "text-text-bright"
                  }`}
                >
                  {item.text}
                </div>

                {/* Category badge */}
                <div className="text-[10px] px-[7px] py-0.5 rounded-md bg-[rgba(255,255,255,0.05)] text-text-secondary">
                  {item.cat}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
