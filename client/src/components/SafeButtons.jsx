import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePostStatus } from "../api/hooks";

export default function SafeButtons({ onSosClick }) {
  const { t } = useTranslation();
  const [mainState, setMainState] = useState("idle"); // idle | sending | sent
  const [smallState, setSmallState] = useState("idle");
  const postStatus = usePostStatus();

  const handleSafeWithLocation = useCallback(() => {
    if (mainState !== "idle") return;
    setMainState("sending");

    const sendStatus = (lat, lng, address) => {
      postStatus.mutate(
        { status: "safe", lat, lng, address },
        {
          onSuccess: () => {
            setMainState("sent");
            setTimeout(() => setMainState("idle"), 3000);
          },
          onError: () => {
            setMainState("sent");
            setTimeout(() => setMainState("idle"), 3000);
          },
        }
      );
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendStatus(pos.coords.latitude, pos.coords.longitude, null),
        () => sendStatus(null, null, null),
        { timeout: 5000 }
      );
    } else {
      sendStatus(null, null, null);
    }
  }, [mainState, postStatus]);

  const handleSafeOnly = useCallback(() => {
    if (smallState !== "idle") return;
    setSmallState("sending");
    postStatus.mutate(
      { status: "safe" },
      {
        onSuccess: () => {
          setSmallState("sent");
          setTimeout(() => setSmallState("idle"), 3000);
        },
        onError: () => {
          setSmallState("sent");
          setTimeout(() => setSmallState("idle"), 3000);
        },
      }
    );
  }, [smallState, postStatus]);

  const mainIcon =
    mainState === "sending" ? "⏳" : mainState === "sent" ? "✅" : "🟢";
  const mainText =
    mainState === "sending"
      ? t("sendingSafe")
      : mainState === "sent"
        ? t("sent")
        : t("iAmSafeWithLocation");

  const smallText =
    smallState === "sending"
      ? t("sendingSafe")
      : smallState === "sent"
        ? t("sent")
        : `✅ ${t("iAmSafe")}`;

  return (
    <div className="px-4 pt-5 pb-2">
      {/* Main safe button */}
      <button
        onClick={handleSafeWithLocation}
        disabled={mainState !== "idle"}
        className={`w-full py-[22px] px-5 rounded-[20px] border-none cursor-pointer text-[22px] font-extrabold tracking-tight text-white flex items-center justify-center gap-2.5 transition-all duration-300 active:scale-[0.97] ${
          mainState === "sent"
            ? "bg-[linear-gradient(135deg,#16a34a,#15803d)] shadow-[0_0_40px_rgba(34,197,94,0.6),0_8px_32px_rgba(0,0,0,0.4)]"
            : "bg-[linear-gradient(135deg,#22c55e,#16a34a)] shadow-[0_0_30px_rgba(34,197,94,0.4),0_8px_24px_rgba(0,0,0,0.3)]"
        }`}
      >
        <span>{mainIcon}</span>
        <span>{mainText}</span>
      </button>

      {/* Small safe button */}
      <button
        onClick={handleSafeOnly}
        disabled={smallState !== "idle"}
        className="w-full mt-2 py-[13px] px-5 rounded-[14px] border border-green-border cursor-pointer bg-green-bg text-accent-green text-[15px] font-semibold transition-all duration-200"
      >
        {smallText}
      </button>

      {/* SOS button */}
      <button
        onClick={onSosClick}
        className="w-full mt-2 py-[13px] px-5 rounded-[14px] border border-red-border cursor-pointer bg-red-bg text-accent-red text-[15px] font-bold transition-all duration-200"
      >
        🆘 {t("sosEmergency")}
      </button>
    </div>
  );
}
