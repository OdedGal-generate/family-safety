import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRegisterUser, useLogin, useCreateGroup } from "../api/hooks";
import { saveAuth, saveGroupId } from "../api/client";
import { subscribeToPush } from "../services/pushNotifications";

const LANGUAGES = ["he", "en", "ar", "fr", "es", "ru", "fa", "zh", "ja", "uk"];

export default function OnboardingScreen({ onCreateGroup, onJoinGroup }) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState("choice"); // "choice" | "register" | "login" | "groupName"
  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState("");

  const registerUser = useRegisterUser();
  const login = useLogin();
  const createGroup = useCreateGroup();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!userName.trim() || !phone.trim() || pin.length !== 4) return;
    setError("");
    try {
      const data = await registerUser.mutateAsync({
        name: userName.trim(),
        phone: phone.trim(),
        pin,
      });
      saveAuth(data.token, data.user);
      subscribeToPush().catch(() => {});
      setStep("groupName");
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0] || err.message;
      setError(msg);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phone.trim() || pin.length !== 4) return;
    setError("");
    try {
      const data = await login.mutateAsync({ phone: phone.trim(), pin });
      saveAuth(data.token, data.user);
      subscribeToPush().catch(() => {});
      setStep("groupName");
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0] || err.message;
      setError(msg);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setError("");
    try {
      const groupData = await createGroup.mutateAsync({ name: groupName.trim() });
      saveGroupId(groupData.group.id);
      onCreateGroup(groupName.trim());
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const loading = registerUser.isPending || login.isPending || createGroup.isPending;

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

      {/* Language selector — 2-row grid at top of screen */}
      <div className="absolute top-3 z-10 grid grid-cols-5 gap-1.5 px-4 w-full max-w-[320px]">
        {LANGUAGES.map((lng) => (
          <button
            key={lng}
            onClick={() => i18n.changeLanguage(lng)}
            className={`py-1.5 rounded-md border-none cursor-pointer text-[11px] font-semibold transition-all ${
              i18n.language === lng
                ? "bg-green-active text-accent-green"
                : "bg-[rgba(255,255,255,0.05)] text-text-secondary"
            }`}
          >
            {lng.toUpperCase()}
          </button>
        ))}
      </div>

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
              onClick={() => setStep("register")}
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
            <button
              onClick={() => setStep("login")}
              className="w-full py-3 rounded-xl border-none cursor-pointer text-sm font-semibold text-text-secondary bg-transparent hover:text-text-primary transition-all"
            >
              {t("haveAccount")}
            </button>
          </div>
        )}

        {/* Step: Register (name + phone + PIN) */}
        {step === "register" && (
          <form onSubmit={handleRegister} className="w-full flex flex-col gap-3">
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
                {t("phoneNumber")}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("phoneHint")}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[12px] text-text-secondary font-semibold mb-1.5">
                {t("pinLabel")}
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                placeholder="••••"
                required
                maxLength={4}
                className={`${inputClass} text-center text-lg tracking-[8px] font-mono`}
              />
              <div className="text-[11px] text-text-muted mt-1">
                {t("pinHint")}
              </div>
            </div>

            {error && (
              <div className="text-accent-red text-[12px] text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={!userName.trim() || !phone.trim() || pin.length !== 4 || loading}
              className={
                userName.trim() && phone.trim() && pin.length === 4 && !loading
                  ? greenBtnClass
                  : disabledBtnClass
              }
            >
              {loading ? "⏳" : t("registerBtn")}
            </button>

            <button
              type="button"
              onClick={() => { setStep("choice"); setError(""); }}
              className="w-full py-3 rounded-xl border-none cursor-pointer text-sm font-semibold text-text-secondary bg-transparent hover:text-text-primary transition-all"
            >
              {t("back")}
            </button>
          </form>
        )}

        {/* Step: Login (phone + PIN) */}
        {step === "login" && (
          <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
            <div className="text-center mb-2">
              <div className="text-xl mb-1">👋</div>
              <div className="text-[15px] font-bold text-text-primary">
                {t("loginTitle")}
              </div>
              <div className="text-[12px] text-text-secondary mt-1">
                {t("loginDesc")}
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
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[12px] text-text-secondary font-semibold mb-1.5">
                {t("pinLabel")}
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                placeholder="••••"
                required
                maxLength={4}
                className={`${inputClass} text-center text-lg tracking-[8px] font-mono`}
              />
            </div>

            {error && (
              <div className="text-accent-red text-[12px] text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={!phone.trim() || pin.length !== 4 || loading}
              className={
                phone.trim() && pin.length === 4 && !loading
                  ? greenBtnClass
                  : disabledBtnClass
              }
            >
              {loading ? "⏳" : t("loginBtn")}
            </button>

            <button
              type="button"
              onClick={() => { setStep("register"); setError(""); setPin(""); }}
              className="w-full py-3 rounded-xl border-none cursor-pointer text-sm font-semibold text-text-secondary bg-transparent hover:text-text-primary transition-all"
            >
              {t("noAccount")}
            </button>

            <button
              type="button"
              onClick={() => { setStep("choice"); setError(""); setPin(""); }}
              className="w-full py-2 rounded-xl border-none cursor-pointer text-[12px] text-text-muted bg-transparent hover:text-text-secondary transition-all"
            >
              {t("back")}
            </button>
          </form>
        )}

        {/* Step: Group Name (after register/login) */}
        {step === "groupName" && (
          <form onSubmit={handleCreateGroup} className="w-full flex flex-col gap-3">
            <div>
              <label className="block text-[12px] text-text-secondary font-semibold mb-1.5">
                {t("groupName")}
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                autoFocus
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
              disabled={!groupName.trim() || loading}
              className={groupName.trim() && !loading ? greenBtnClass : disabledBtnClass}
            >
              {loading ? "⏳" : t("createAndStart")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
