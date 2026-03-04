import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSendOtp, useVerifyOtp, useRegister, useCreateGroup } from "../api/hooks";
import { saveAuth, saveGroupId } from "../api/client";
import { subscribeToPush } from "../services/pushNotifications";

export default function OnboardingScreen({ onCreateGroup, onJoinGroup }) {
  const { t } = useTranslation();
  const [step, setStep] = useState("choice"); // "choice" | "phone" | "otp" | "details"
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [userName, setUserName] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();
  const register = useRegister();
  const createGroup = useCreateGroup();

  // Resend countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!phone.trim()) return;
    setError("");
    try {
      await sendOtp.mutateAsync({ phone: phone.trim() });
      setCountdown(60);
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;
    setError("");
    try {
      const data = await verifyOtp.mutateAsync({ phone: phone.trim(), code: otpCode });
      saveAuth(data.token, data.user);
      // Try to subscribe to push notifications
      subscribeToPush().catch(() => {});
      setStep("details");
    } catch (err) {
      setError(err.response?.data?.error || t("invalidOtp"));
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError("");
    try {
      await sendOtp.mutateAsync({ phone: phone.trim() });
      setCountdown(60);
      setOtpCode("");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || !userName.trim()) return;
    setError("");
    try {
      // Update profile (user already exists from OTP verify)
      const authData = await register.mutateAsync({ name: userName.trim() });
      saveAuth(authData.token, authData.user);

      // Create group
      const groupData = await createGroup.mutateAsync({ name: groupName.trim() });
      saveGroupId(groupData.group.id);

      onCreateGroup(groupName.trim());
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const loading = sendOtp.isPending || verifyOtp.isPending || register.isPending || createGroup.isPending;

  const inputClass =
    "w-full py-3 px-4 rounded-xl bg-[rgba(255,255,255,0.04)] border border-border-subtle text-[15px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-green-border transition-all";
  const greenBtnClass =
    "w-full py-3.5 rounded-xl border-none cursor-pointer font-bold text-sm bg-gradient-to-r from-accent-green to-accent-green-dark text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.45)] transition-all";
  const disabledBtnClass =
    "w-full py-3.5 rounded-xl border-none cursor-not-allowed font-bold text-sm bg-[rgba(255,255,255,0.06)] text-text-muted transition-all";

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-6 relative">
      {/* Glow effect */}
      <div className="fixed top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.08)_0%,transparent_70%)] pointer-events-none z-0" />

      <div className="relative z-[1] w-full max-w-[340px] flex flex-col items-center">
        {/* Logo */}
        <div className="w-20 h-20 rounded-[22px] bg-gradient-to-br from-accent-green to-accent-green-dark flex items-center justify-center text-4xl shadow-[0_0_40px_rgba(34,197,94,0.4)] mb-6">
          🛡️
        </div>

        {/* Title */}
        <div className="text-2xl font-extrabold text-text-primary text-center mb-2">
          {t("onboardingTitle")}
        </div>
        <div className="text-[13px] text-text-secondary text-center mb-10">
          {t("onboardingDesc")}
        </div>

        {/* Step: Choice */}
        {step === "choice" && (
          <div className="w-full flex flex-col gap-3.5">
            <button
              onClick={() => setStep("phone")}
              className={greenBtnClass}
            >
              {t("createNewGroup")}
            </button>
            <button
              onClick={onJoinGroup}
              className="w-full py-4 rounded-2xl border border-border-subtle bg-[rgba(255,255,255,0.04)] cursor-pointer font-bold text-[15px] text-text-primary hover:bg-[rgba(255,255,255,0.07)] transition-all"
            >
              {t("joinExistingGroup")}
            </button>
          </div>
        )}

        {/* Step: Phone */}
        {step === "phone" && (
          <div className="w-full flex flex-col gap-3.5">
            <div className="text-center mb-2">
              <div className="text-xl mb-1">📱</div>
              <div className="text-[13px] text-text-secondary">
                {t("enterPhone")}
              </div>
            </div>

            <div>
              <label className="block text-[12px] text-text-secondary font-semibold mb-1.5">
                {t("phoneNumber")}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("phoneHint")}
                autoFocus
                className={inputClass}
              />
            </div>

            {error && (
              <div className="text-accent-red text-[12px] text-center">{error}</div>
            )}

            <button
              onClick={handleSendCode}
              disabled={!phone.trim() || loading}
              className={phone.trim() && !loading ? greenBtnClass : disabledBtnClass}
            >
              {loading ? "⏳" : t("sendCode")}
            </button>

            <button
              onClick={() => { setStep("choice"); setError(""); }}
              className="w-full py-3 rounded-xl border-none cursor-pointer text-sm font-semibold text-text-secondary bg-transparent hover:text-text-primary transition-all"
            >
              {t("back")}
            </button>
          </div>
        )}

        {/* Step: OTP */}
        {step === "otp" && (
          <div className="w-full flex flex-col gap-3.5">
            <div className="text-center mb-2">
              <div className="text-xl mb-1">🔐</div>
              <div className="text-[13px] text-text-secondary">
                {t("enterOtp")}
              </div>
              <div className="text-[11px] text-text-muted mt-1">
                {t("otpHint")}
              </div>
            </div>

            <input
              type="text"
              inputMode="numeric"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="000000"
              autoFocus
              className="w-full max-w-[200px] mx-auto block text-center text-[28px] font-extrabold tracking-[6px] font-mono bg-[rgba(255,255,255,0.04)] border border-border-subtle rounded-xl py-3 px-4 text-accent-green placeholder:text-text-muted focus:outline-none focus:border-green-border transition-all"
            />

            {error && (
              <div className="text-accent-red text-[12px] text-center">{error}</div>
            )}

            <button
              onClick={handleVerifyOtp}
              disabled={otpCode.length !== 6 || loading}
              className={otpCode.length === 6 && !loading ? greenBtnClass : disabledBtnClass}
            >
              {loading ? "⏳" : t("verifyCode")}
            </button>

            <button
              onClick={handleResend}
              disabled={countdown > 0 || loading}
              className="w-full py-3 rounded-xl border-none cursor-pointer text-sm font-semibold text-text-secondary bg-transparent hover:text-text-primary transition-all disabled:opacity-50"
            >
              {countdown > 0
                ? t("resendIn", { n: countdown })
                : t("resendCode")}
            </button>

            <button
              onClick={() => { setStep("phone"); setError(""); setOtpCode(""); }}
              className="w-full py-2 rounded-xl border-none cursor-pointer text-[12px] text-text-muted bg-transparent hover:text-text-secondary transition-all"
            >
              {t("back")}
            </button>
          </div>
        )}

        {/* Step: Details (name + group) */}
        {step === "details" && (
          <form onSubmit={handleCreate} className="w-full flex flex-col gap-3">
            <div>
              <label className="block text-[12px] text-text-secondary font-semibold mb-1.5">
                {t("fullName")}
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                autoFocus
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[12px] text-text-secondary font-semibold mb-1.5">
                {t("groupName")}
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                className={inputClass}
                placeholder={t("groupName")}
              />
            </div>

            {error && (
              <div className="text-accent-red text-[12px] text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={!groupName.trim() || !userName.trim() || loading}
              className={
                groupName.trim() && userName.trim() && !loading
                  ? greenBtnClass
                  : disabledBtnClass
              }
            >
              {loading ? "⏳" : t("createAndStart")}
            </button>

            <button
              type="button"
              onClick={() => { setStep("phone"); setError(""); }}
              className="w-full py-3 rounded-xl border-none cursor-pointer text-sm font-semibold text-text-secondary bg-transparent hover:text-text-primary transition-all"
            >
              {t("back")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
