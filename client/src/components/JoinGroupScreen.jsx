import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRegisterUser, useLogin, useUpdateProfile, useJoinGroup } from "../api/hooks";
import { saveAuth } from "../api/client";
import { subscribeToPush } from "../services/pushNotifications";

export default function JoinGroupScreen({ onBack, onJoined }) {
  const { t } = useTranslation();
  const [step, setStep] = useState("code"); // "code" | "register" | "login" | "form" | "pending"
  const [code, setCode] = useState("");
  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("");
  const [showQRPlaceholder, setShowQRPlaceholder] = useState(false);
  const [error, setError] = useState("");

  const registerUser = useRegisterUser();
  const login = useLogin();
  const updateProfile = useUpdateProfile();
  const joinGroup = useJoinGroup();

  // Auto-format code with dash after 3 digits
  const handleCodeChange = (e) => {
    let raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
    if (raw.length > 3) {
      raw = raw.slice(0, 3) + "-" + raw.slice(3);
    }
    setCode(raw);
  };

  const codeDigits = code.replace("-", "").length;

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
      setDisplayName(userName.trim());
      setStep("form");
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
      setDisplayName(data.user.name || "");
      setStep("form");
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0] || err.message;
      setError(msg);
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!displayName || !role) return;
    setError("");
    try {
      // Update profile name if needed
      const authData = await updateProfile.mutateAsync({ name: displayName.trim() });
      saveAuth(authData.token, authData.user);

      // Submit join request
      await joinGroup.mutateAsync({
        code,
        display_name: displayName.trim(),
        phone: phone.trim(),
        self_description: role,
      });

      setStep("pending");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const loading = registerUser.isPending || login.isPending || updateProfile.isPending || joinGroup.isPending;

  const inputClass =
    "w-full py-3 px-3.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-green-border transition-all";
  const greenBtnClass =
    "w-full py-3.5 rounded-xl border-none cursor-pointer font-bold text-sm bg-gradient-to-r from-accent-green to-accent-green-dark text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.45)] transition-all";
  const disabledBtnClass =
    "w-full py-3.5 rounded-xl border-none cursor-not-allowed font-bold text-sm bg-[rgba(255,255,255,0.06)] text-text-muted transition-all";

  const backStep = () => {
    setError("");
    setPin("");
    if (step === "register" || step === "login") setStep("code");
    else if (step === "form") setStep("register");
    else onBack();
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 bg-[rgba(255,255,255,0.03)] backdrop-blur-[20px] border-b border-border-light flex items-center gap-3">
        <button
          onClick={backStep}
          className="w-9 h-9 rounded-[10px] bg-[rgba(255,255,255,0.05)] border-none cursor-pointer text-text-secondary text-base flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)] transition-all"
        >
          ←
        </button>
        <div className="text-[15px] font-bold">{t("joinGroup")}</div>
      </div>

      <div className="flex-1 p-5">
        {/* Step 1: Enter invite code */}
        {step === "code" && (
          <div className="flex flex-col gap-5">
            <div className="text-center pt-4">
              <div className="text-xl mb-2">🔑</div>
              <div className="text-[15px] font-bold text-text-primary mb-1">
                {t("enterInviteCode")}
              </div>
              <div className="text-[12px] text-text-secondary mb-5">
                {t("codeHint")}
              </div>

              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={handleCodeChange}
                placeholder="000-000"
                className="w-full max-w-[200px] mx-auto block text-center text-[28px] font-extrabold tracking-[6px] font-mono bg-[rgba(255,255,255,0.04)] border border-border-subtle rounded-xl py-3 px-4 text-accent-green placeholder:text-text-muted focus:outline-none focus:border-green-border transition-all"
              />
            </div>

            <button
              onClick={() => setShowQRPlaceholder(!showQRPlaceholder)}
              className="w-full py-3.5 rounded-xl border border-border-subtle bg-[rgba(255,255,255,0.04)] cursor-pointer text-sm font-semibold text-text-primary hover:bg-[rgba(255,255,255,0.07)] transition-all"
            >
              {t("scanQR")}
            </button>

            {showQRPlaceholder && (
              <div className="flex items-center justify-center py-10 px-4 rounded-xl border border-border-subtle bg-[rgba(255,255,255,0.02)]">
                <div className="text-center">
                  <div className="text-3xl mb-2">📷</div>
                  <div className="text-[13px] text-text-secondary">
                    {t("scanQRPlaceholder")}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setStep("register")}
              disabled={codeDigits < 6}
              className={codeDigits >= 6 ? greenBtnClass : disabledBtnClass}
            >
              {t("next")}
            </button>
          </div>
        )}

        {/* Step 2: Register (name + phone + PIN) */}
        {step === "register" && (
          <form onSubmit={handleRegister} className="flex flex-col gap-3.5 pt-2">
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
              onClick={() => { setStep("login"); setError(""); setPin(""); }}
              className="w-full py-3 rounded-xl border-none cursor-pointer text-sm font-semibold text-text-secondary bg-transparent hover:text-text-primary transition-all"
            >
              {t("haveAccount")}
            </button>
          </form>
        )}

        {/* Step 2b: Login (phone + PIN) */}
        {step === "login" && (
          <form onSubmit={handleLogin} className="flex flex-col gap-3.5 pt-2">
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
          </form>
        )}

        {/* Step 3: Fill form (display name + role) */}
        {step === "form" && (
          <form onSubmit={handleSubmitForm} className="flex flex-col gap-3.5 pt-2">
            <div className="text-center py-2.5 px-4 rounded-xl bg-[rgba(34,197,94,0.08)] border border-green-border mb-1">
              <span className="text-[11px] text-text-secondary font-semibold">
                {t("inviteCode")}:
              </span>{" "}
              <span className="text-accent-green font-bold font-mono tracking-wider">
                {code}
              </span>
            </div>

            <div>
              <label className="block text-[12px] text-text-secondary font-semibold mb-1.5">
                {t("fullName")}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoFocus
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[12px] text-text-secondary font-semibold mb-1.5">
                {t("roleInGroup")}
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            {error && (
              <div className="text-accent-red text-[12px] text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={!displayName || !role || loading}
              className={`mt-2 ${displayName && role && !loading ? greenBtnClass : disabledBtnClass}`}
            >
              {loading ? "⏳" : t("submit")}
            </button>
          </form>
        )}

        {/* Step 4: Pending approval */}
        {step === "pending" && (
          <div className="flex flex-col items-center justify-center text-center pt-16 gap-4">
            <div className="w-20 h-20 rounded-full bg-yellow-bg border border-yellow-border flex items-center justify-center text-4xl">
              ⏳
            </div>
            <div className="text-xl font-bold text-accent-yellow">
              {t("pendingApproval")}
            </div>
            <div className="text-[13px] text-text-secondary leading-relaxed max-w-[280px]">
              {t("pendingApprovalDesc")}
            </div>
            <button
              onClick={onJoined}
              className="mt-4 py-3 px-8 rounded-xl bg-[rgba(255,255,255,0.06)] border-none cursor-pointer text-sm font-semibold text-text-primary hover:bg-[rgba(255,255,255,0.1)] transition-all"
            >
              {t("backToHome")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
