import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

const DISMISS_KEY = "familyShield_installDismissed";
const INSTALLED_KEY = "familyShield_installed";
const DISMISS_DAYS = 7;

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isMobile() {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
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
  const [platform, setPlatform] = useState(null); // "android" | "ios"
  const deferredPrompt = useRef(null);

  useEffect(() => {
    // Desktop — never show
    if (!isMobile()) return;

    // Already installed as PWA
    if (isStandalone()) {
      localStorage.setItem(INSTALLED_KEY, "1");
      return;
    }

    // Was installed before
    if (localStorage.getItem(INSTALLED_KEY)) return;

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

    // Also listen for successful install
    const onInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, "1");
      setVisible(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    const timer = setTimeout(() => {
      if (ios) {
        setPlatform("ios");
        setVisible(true);
      } else if (deferredPrompt.current) {
        setPlatform("android");
        setVisible(true);
      }
    }, 10000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("appinstalled", onInstalled);
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
      localStorage.setItem(INSTALLED_KEY, "1");
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
        <div className="mx-3 mb-3 rounded-2xl bg-modal-bg border border-border-subtle p-5 shadow-[0_-4px_30px_rgba(0,0,0,0.3)] relative">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 end-3 w-8 h-8 rounded-full bg-[rgba(255,255,255,0.08)] border-none cursor-pointer text-text-muted text-lg flex items-center justify-center hover:bg-[rgba(255,255,255,0.15)] transition-all"
          >
            ×
          </button>

          {/* Icon + app name + description */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-green to-accent-green-dark flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(34,197,94,0.3)] shrink-0">
              🛡️
            </div>
            <div className="pe-6">
              <div className="text-[15px] font-bold text-text-primary mb-0.5">
                {t("appName")}
              </div>
              <div className="text-[12px] text-text-secondary leading-relaxed">
                {t("installDesc")}
              </div>
            </div>
          </div>

          {platform === "ios" ? (
            /* iOS step-by-step instructions */
            <div className="flex flex-col gap-3">
              <div className="bg-[rgba(255,255,255,0.04)] rounded-xl p-3.5 flex flex-col gap-3">
                {/* Step 1 */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.08)] flex items-center justify-center text-lg shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-blue">
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="text-[13px] text-text-primary">
                    <span className="font-semibold">{t("installIOSStep1Label")}</span>{" "}
                    <span className="text-text-secondary">{t("installIOSStep1")}</span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.08)] flex items-center justify-center text-lg shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-green">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </div>
                  <div className="text-[13px] text-text-primary">
                    <span className="font-semibold">{t("installIOSStep2Label")}</span>{" "}
                    <span className="text-text-secondary">{t("installIOSStep2")}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="w-full py-3.5 rounded-xl border-none cursor-pointer font-bold text-sm bg-gradient-to-r from-accent-green to-accent-green-dark text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.45)] transition-all"
              >
                {t("installGotIt")}
              </button>
            </div>
          ) : (
            /* Android — install + not now buttons */
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleInstall}
                className="w-full py-3.5 rounded-xl border-none cursor-pointer font-bold text-sm bg-gradient-to-r from-accent-green to-accent-green-dark text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.45)] transition-all"
              >
                {t("installBtn")}
              </button>
              <button
                onClick={handleDismiss}
                className="w-full py-3 rounded-xl border-none cursor-pointer text-sm font-semibold text-text-secondary bg-transparent hover:text-text-primary transition-all"
              >
                {t("installNotNow")}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
