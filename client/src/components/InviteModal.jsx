import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { useCreateInvite } from "../api/hooks";

export default function InviteModal({ open, onClose }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const createInvite = useCreateInvite();
  const [inviteCode, setInviteCode] = useState("");

  // Generate invite code when modal opens
  useEffect(() => {
    if (open && !inviteCode) {
      createInvite.mutate(undefined, {
        onSuccess: (data) => {
          setInviteCode(data.code);
        },
      });
    }
    if (!open) {
      setInviteCode("");
    }
  }, [open]);

  if (!open) return null;

  const displayCode = inviteCode || "···-···";
  const inviteUrl = `https://family-shield.app/join?code=${inviteCode}`;

  const handleCopy = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = inviteCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsApp = () => {
    if (!inviteCode) return;
    const msg = t("whatsAppInviteMessage", { code: inviteCode });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div
      className="fixed inset-0 bg-[rgba(0,0,0,0.7)] backdrop-blur-[8px] flex items-end sm:items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[380px] bg-modal-bg rounded-[20px] border border-border-subtle p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rtl:right-auto rtl:left-4 w-8 h-8 rounded-full bg-[rgba(255,255,255,0.05)] border-none cursor-pointer text-text-secondary text-lg flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)] transition-all"
        >
          ✕
        </button>

        {/* Title */}
        <div className="text-center mb-5">
          <div className="text-lg font-bold text-text-primary mb-1">
            {t("inviteTitle")}
          </div>
          <div className="text-[12px] text-text-secondary">
            {t("inviteDesc")}
          </div>
        </div>

        {/* Invite code display */}
        <div className="text-center py-4 px-5 rounded-[14px] bg-[rgba(34,197,94,0.08)] border border-green-border mb-4">
          <div className="text-[11px] text-text-secondary mb-1.5 font-semibold uppercase tracking-wider">
            {t("inviteCode")}
          </div>
          <div className="text-[32px] font-extrabold text-accent-green tracking-[6px] font-mono">
            {createInvite.isPending ? "⏳" : displayCode}
          </div>
          <div className="text-[11px] text-text-secondary mt-1.5">
            {t("inviteValidity")}
          </div>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <div className="bg-white p-3 rounded-xl">
            {inviteCode ? (
              <QRCodeSVG
                value={inviteUrl}
                size={140}
                bgColor="#ffffff"
                fgColor="#0a0f1e"
                level="M"
              />
            ) : (
              <div className="w-[140px] h-[140px] flex items-center justify-center text-3xl">
                ⏳
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2.5 mb-2">
          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            disabled={!inviteCode}
            className={`flex-1 py-3 rounded-xl border-none cursor-pointer font-semibold text-sm transition-all ${
              inviteCode
                ? "bg-[rgba(34,197,94,0.15)] text-accent-green hover:bg-[rgba(34,197,94,0.25)]"
                : "bg-[rgba(255,255,255,0.06)] text-text-muted cursor-not-allowed"
            }`}
          >
            {t("shareWhatsApp")}
          </button>

          {/* Copy Code */}
          <button
            onClick={handleCopy}
            disabled={!inviteCode}
            className={`flex-1 py-3 rounded-xl border-none cursor-pointer font-semibold text-sm transition-all ${
              copied
                ? "bg-[rgba(34,197,94,0.25)] text-accent-green"
                : inviteCode
                  ? "bg-[rgba(255,255,255,0.06)] text-text-primary hover:bg-[rgba(255,255,255,0.1)]"
                  : "bg-[rgba(255,255,255,0.06)] text-text-muted cursor-not-allowed"
            }`}
          >
            {copied ? t("codeCopied") : t("copyCode")}
          </button>
        </div>
      </div>
    </div>
  );
}
