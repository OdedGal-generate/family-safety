import { useTranslation } from "react-i18next";

export default function SosModal({ open, onClose, onConfirm }) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-[rgba(0,0,0,0.85)] backdrop-blur-[10px] z-[200] flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[380px] bg-sos-bg rounded-3xl p-8 px-6 border border-red-border shadow-[0_0_60px_rgba(239,68,68,0.2)] text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[56px] mb-3">🆘</div>
        <div className="text-xl font-extrabold text-accent-red mb-2">
          {t("sosTitle")}
        </div>
        <div className="text-[13px] text-[#94a3b8] mb-7">{t("sosDesc")}</div>
        <button
          onClick={onConfirm}
          className="w-full py-4 rounded-[14px] border-none bg-[linear-gradient(135deg,#ef4444,#dc2626)] text-white text-base font-extrabold cursor-pointer mb-2.5 shadow-[0_0_30px_rgba(239,68,68,0.4)]"
        >
          {t("sosSend")}
        </button>
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-[14px] border border-[rgba(255,255,255,0.1)] bg-transparent text-text-secondary text-sm cursor-pointer"
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
