import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

const DISMISS_KEY = "familyShield_installDismissed";
const DISMISS_DAYS = 7;

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true
  );
}

export default function InstallPrompt() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const deferredPrompt = useRef(null);

  useEffect(() => {
    // Already installed as PWA
    if (isStandalone()) return;

    // Dismissed recently
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
      localStorage.removeItem(DISMISS_KEY);
    }

    const ios = isIOS();

    const onBeforeInstall = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
    };

    if (!ios) {
      window.addEventListener("beforeinstallprompt", onBeforeInstall);
    }

    const timer = setTimeout(() => {
      if (ios) {
        setShowIOS(true);
        setVisible(true);
      } else if (deferredPrompt.current) {
        setVisible(true);
      }
    }, 10000);

    return () => {
      clearTimeout(timer);
      if (!ios) {
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      }
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    deferredPrompt.current = null;
    if (outcome === "accepted") {
      setVisible(false);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        className="fixed inset-0 bg-black/50 z-[998] animate-[fadeIn_0.3s_ease]"
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] z-[999] animate-[slideUp_0.3s_ease]">
        <div className="mx-3 mb-3 rounded-2xl bg-modal-bg border border-border-subtle p-5 shadow-[0_-4px_30px_rgba(0,0,0,0.3)]">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[rgba(255,255,255,0.08)] border-none cursor-pointer text-text-muted text-lg flex items-center justify-center hover:bg-[rgba(255,255,255,0.15)] transition-all"
          >
            ×
          </button>

          {/* Icon + text */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-green to-accent-green-dark flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(34,197,94,0.3)] shrink-0">
              🛡️
            </div>
            <div>
              <div className="text-[15px] font-bold text-text-primary mb-0.5">
                {t("installTitle")}
              </div>
              <div className="text-[12px] text-text-secondary leading-relaxed">
                {t("installDesc")}
              </div>
            </div>
          </div>

          {showIOS ? (
            /* iOS manual instructions */
            <div className="bg-[rgba(255,255,255,0.04)] rounded-xl p-3.5 text-[13px] text-text-secondary leading-relaxed">
              {t("installIOSStep1")}{" "}
              <span className="inline-block text-base align-middle">
                ⎙
              </span>{" "}
              {t("installIOSStep2")}
            </div>
          ) : (
            /* Android install button */
            <button
              onClick={handleInstall}
              className="w-full py-3.5 rounded-xl border-none cursor-pointer font-bold text-sm bg-gradient-to-r from-accent-green to-accent-green-dark text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.45)] transition-all"
            >
              {t("installBtn")}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
