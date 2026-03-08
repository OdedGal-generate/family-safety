import { useState } from "react";
import { getAdminToken, saveAdminToken, clearAdminToken } from "../api/adminClient";
import {
  useAdminLogin,
  useAdminGroups,
  useAdminGroupMembers,
  useAdminRemoveMember,
  useAdminDeleteUser,
  useAdminDeleteGroup,
  useAdminUpdateGroup,
  useAdminUpdateUser,
  useAdminSettings,
  useAdminChangePassword,
  useAdmin2FASetup,
  useAdmin2FAVerify,
  useAdmin2FADisable,
} from "../api/adminHooks";

// ── Helpers ──

function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts + "Z").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts + "Z");
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    " " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

function statusBadge(status) {
  if (!status) return <span className="text-text-muted text-xs">No report</span>;
  const map = {
    safe: { text: "Safe", cls: "bg-green-bg text-accent-green border-green-border" },
    need_help: { text: "Need Help", cls: "bg-yellow-bg text-accent-yellow border-yellow-border" },
    sos: { text: "SOS", cls: "bg-red-bg text-accent-red border-red-border" },
  };
  const s = map[status] || { text: status, cls: "bg-[rgba(255,255,255,0.06)] text-text-secondary border-border-subtle" };
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${s.cls}`}>
      {s.text}
    </span>
  );
}

function roleBadge(role) {
  const map = {
    owner: "bg-[rgba(96,165,250,0.15)] text-accent-blue border-blue-border",
    admin: "bg-[rgba(234,179,8,0.15)] text-accent-yellow border-yellow-border",
    member: "bg-[rgba(255,255,255,0.06)] text-text-secondary border-border-subtle",
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${map[role] || map.member}`}>
      {role}
    </span>
  );
}

// ── Shared styles ──

const thClass =
  "px-4 py-3 text-start text-[11px] font-bold text-text-muted uppercase tracking-wider";
const tdClass = "px-4 py-3 text-sm text-text-primary";
const rowClass =
  "border-b border-border-subtle hover:bg-[rgba(255,255,255,0.03)] transition-colors";

const inputClass =
  "w-full py-3 px-4 rounded-xl bg-[rgba(255,255,255,0.04)] border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-green-border transition-all";

const btnPrimary =
  "w-full py-3 rounded-xl border-none cursor-pointer font-bold text-sm bg-gradient-to-r from-accent-green to-accent-green-dark text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.45)] transition-all disabled:opacity-50";

const btnDanger =
  "px-4 py-2.5 rounded-xl border cursor-pointer font-semibold text-sm bg-[rgba(239,68,68,0.1)] text-accent-red border-red-border hover:bg-[rgba(239,68,68,0.2)] transition-all disabled:opacity-50";

const cardClass =
  "bg-modal-bg rounded-2xl border border-border-subtle p-6";

const smallBtnClass =
  "px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-all disabled:opacity-50";

const smallInputClass =
  "py-1.5 px-2.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-green-border transition-all";

// ══════════════════════════════════════════
// Login Screen (with 2FA step)
// ══════════════════════════════════════════

function AdminLogin({ onLogin }) {
  const [step, setStep] = useState("password"); // "password" | "totp"
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState("");
  const loginMutation = useAdminLogin();

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate(
      { password },
      {
        onSuccess: (data) => {
          if (data.requires2FA) {
            setStep("totp");
          } else if (data.token) {
            saveAdminToken(data.token);
            onLogin();
          }
        },
        onError: (err) => {
          setError(err.response?.data?.error || "Login failed");
        },
      }
    );
  };

  const handleTotpSubmit = (e) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate(
      { password, totp_code: totpCode },
      {
        onSuccess: (data) => {
          if (data.token) {
            saveAdminToken(data.token);
            onLogin();
          }
        },
        onError: (err) => {
          setError(err.response?.data?.error || "Invalid code");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="w-full max-w-[360px] mx-4">
        <div className={cardClass + " p-8"}>
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-accent-green to-accent-green-dark flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(34,197,94,0.3)] mb-4">
              🛡️
            </div>
            <h1 className="text-lg font-bold text-text-primary">Admin Dashboard</h1>
            <p className="text-xs text-text-secondary mt-1">
              {step === "password" ? "Enter admin password" : "Enter 2FA code from your authenticator app"}
            </p>
          </div>

          {step === "password" ? (
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Password"
                autoFocus
                className={inputClass + " mb-3"}
              />
              {error && (
                <div className="text-accent-red text-xs text-center mb-3">{error}</div>
              )}
              <button type="submit" disabled={loginMutation.isPending} className={btnPrimary}>
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleTotpSubmit}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={(e) => { setTotpCode(e.target.value.replace(/\D/g, "")); setError(""); }}
                placeholder="6-digit code"
                autoFocus
                className={inputClass + " mb-3 text-center text-xl tracking-[0.3em] font-mono"}
              />
              {error && (
                <div className="text-accent-red text-xs text-center mb-3">{error}</div>
              )}
              <button type="submit" disabled={loginMutation.isPending} className={btnPrimary}>
                {loginMutation.isPending ? "Verifying..." : "Verify"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("password"); setTotpCode(""); setError(""); }}
                className="w-full mt-2 py-2 text-xs text-text-muted hover:text-text-secondary transition-colors bg-transparent border-none cursor-pointer"
              >
                ← Back to password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// Settings View (Change Password + 2FA)
// ══════════════════════════════════════════

function AdminSettingsView({ onBack }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.06)] border-none cursor-pointer text-text-secondary text-sm flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)] transition-all"
        >
          ←
        </button>
        <h2 className="text-base font-bold text-text-primary">Settings</h2>
      </div>

      <div className="grid gap-6 max-w-[520px]">
        <ChangePasswordCard />
        <TwoFactorCard />
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const changePassword = useAdminChangePassword();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setSuccess("Password changed successfully");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (err) => {
          setError(err.response?.data?.error || "Failed to change password");
        },
      }
    );
  };

  return (
    <div className={cardClass}>
      <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
        <span className="text-base">🔑</span> Change Password
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => { setCurrentPassword(e.target.value); setError(""); setSuccess(""); }}
          placeholder="Current password"
          className={inputClass}
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => { setNewPassword(e.target.value); setError(""); setSuccess(""); }}
          placeholder="New password (min 8 characters)"
          className={inputClass}
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); setError(""); setSuccess(""); }}
          placeholder="Confirm new password"
          className={inputClass}
        />
        {error && <div className="text-accent-red text-xs">{error}</div>}
        {success && <div className="text-accent-green text-xs">{success}</div>}
        <button type="submit" disabled={changePassword.isPending} className={btnPrimary}>
          {changePassword.isPending ? "Changing..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}

function TwoFactorCard() {
  const { data: settings, isLoading } = useAdminSettings();
  const setup2FA = useAdmin2FASetup();
  const verify2FA = useAdmin2FAVerify();
  const disable2FA = useAdmin2FADisable();

  const [setupData, setSetupData] = useState(null); // { qrCode, secret }
  const [verifyCode, setVerifyCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const totpEnabled = !!settings?.totp_enabled;

  const handleSetup = () => {
    setError("");
    setSuccess("");
    setup2FA.mutate(undefined, {
      onSuccess: (data) => {
        setSetupData(data);
      },
      onError: (err) => {
        setError(err.response?.data?.error || "Failed to setup 2FA");
      },
    });
  };

  const handleVerify = (e) => {
    e.preventDefault();
    setError("");
    verify2FA.mutate(
      { code: verifyCode },
      {
        onSuccess: () => {
          setSuccess("2FA enabled successfully!");
          setSetupData(null);
          setVerifyCode("");
        },
        onError: (err) => {
          setError(err.response?.data?.error || "Invalid code");
        },
      }
    );
  };

  const handleDisable = (e) => {
    e.preventDefault();
    setError("");
    disable2FA.mutate(
      { password: disablePassword },
      {
        onSuccess: () => {
          setSuccess("2FA disabled");
          setDisablePassword("");
          setShowDisable(false);
        },
        onError: (err) => {
          setError(err.response?.data?.error || "Failed to disable 2FA");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className={cardClass}>
        <div className="text-text-secondary text-sm">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className={cardClass}>
      <h3 className="text-sm font-bold text-text-primary mb-1 flex items-center gap-2">
        <span className="text-base">📱</span> Two-Factor Authentication
      </h3>
      <p className="text-xs text-text-muted mb-4">
        {totpEnabled
          ? "2FA is enabled. You'll need your authenticator app to log in."
          : "Add an extra layer of security with an authenticator app."}
      </p>

      {/* Status badge */}
      <div className="mb-4">
        {totpEnabled ? (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-bg text-accent-green border border-green-border">
            ✓ Enabled
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[rgba(255,255,255,0.06)] text-text-muted border border-border-subtle">
            Disabled
          </span>
        )}
      </div>

      {error && <div className="text-accent-red text-xs mb-3">{error}</div>}
      {success && <div className="text-accent-green text-xs mb-3">{success}</div>}

      {/* ENABLE FLOW */}
      {!totpEnabled && !setupData && (
        <button
          onClick={handleSetup}
          disabled={setup2FA.isPending}
          className={btnPrimary}
        >
          {setup2FA.isPending ? "Generating..." : "Enable 2FA"}
        </button>
      )}

      {/* QR Code + Verify */}
      {!totpEnabled && setupData && (
        <div className="space-y-4">
          <div className="text-xs text-text-secondary">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
          </div>
          <div className="flex justify-center">
            <img
              src={setupData.qrCode}
              alt="2FA QR Code"
              className="w-48 h-48 rounded-xl"
            />
          </div>
          <div className="bg-[rgba(255,255,255,0.04)] rounded-xl p-3">
            <div className="text-[10px] text-text-muted mb-1 uppercase tracking-wider">
              Backup code (save this!)
            </div>
            <div className="text-xs font-mono text-text-primary break-all select-all">
              {setupData.secret}
            </div>
          </div>
          <form onSubmit={handleVerify} className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => { setVerifyCode(e.target.value.replace(/\D/g, "")); setError(""); }}
              placeholder="Enter 6-digit code to verify"
              autoFocus
              className={inputClass + " text-center text-lg tracking-[0.3em] font-mono"}
            />
            <button type="submit" disabled={verify2FA.isPending} className={btnPrimary}>
              {verify2FA.isPending ? "Verifying..." : "Verify & Enable"}
            </button>
          </form>
          <button
            onClick={() => { setSetupData(null); setVerifyCode(""); setError(""); }}
            className="w-full py-2 text-xs text-text-muted hover:text-text-secondary transition-colors bg-transparent border-none cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* DISABLE FLOW */}
      {totpEnabled && !showDisable && (
        <button
          onClick={() => { setShowDisable(true); setError(""); setSuccess(""); }}
          className={btnDanger}
        >
          Disable 2FA
        </button>
      )}

      {totpEnabled && showDisable && (
        <form onSubmit={handleDisable} className="space-y-3">
          <div className="text-xs text-text-secondary">
            Enter your password to disable 2FA:
          </div>
          <input
            type="password"
            value={disablePassword}
            onChange={(e) => { setDisablePassword(e.target.value); setError(""); }}
            placeholder="Admin password"
            autoFocus
            className={inputClass}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={disable2FA.isPending} className={btnDanger + " flex-1"}>
              {disable2FA.isPending ? "Disabling..." : "Confirm Disable"}
            </button>
            <button
              type="button"
              onClick={() => { setShowDisable(false); setDisablePassword(""); setError(""); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[rgba(255,255,255,0.06)] text-text-secondary border border-border-subtle cursor-pointer hover:bg-[rgba(255,255,255,0.1)] transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// Groups List
// ══════════════════════════════════════════

function AdminGroupsList({ onSelectGroup }) {
  const { data: groups, isLoading, error } = useAdminGroups();
  const deleteGroup = useAdminDeleteGroup();
  const updateGroup = useAdminUpdateGroup();
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");

  const startEdit = (g, e) => {
    e.stopPropagation();
    setEditingId(g.id);
    setEditName(g.name);
    setEditType(g.type);
  };

  const saveEdit = (e) => {
    e.stopPropagation();
    updateGroup.mutate(
      { groupId: editingId, name: editName, type: editType },
      { onSuccess: () => setEditingId(null) }
    );
  };

  const cancelEdit = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (g, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete group "${g.name}" + all members?`)) return;
    deleteGroup.mutate({ groupId: g.id });
  };

  if (isLoading) {
    return <div className="text-text-secondary text-sm py-8 text-center">Loading groups...</div>;
  }

  if (error) {
    return (
      <div className="text-accent-red text-sm py-8 text-center">
        Error: {error.response?.data?.error || error.message}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-base font-bold text-text-primary mb-4">
        Groups ({groups?.length || 0})
      </h2>

      <div className="overflow-x-auto rounded-xl border border-border-subtle">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[rgba(255,255,255,0.03)]">
              <th className={thClass}>ID</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Type</th>
              <th className={thClass}>Owner</th>
              <th className={thClass}>Members</th>
              <th className={thClass}>Created</th>
              <th className={thClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups?.map((g) => (
              <tr
                key={g.id}
                onClick={() => editingId !== g.id && onSelectGroup(g.id)}
                className={`${rowClass} cursor-pointer`}
              >
                <td className={`${tdClass} text-text-muted font-mono text-xs`}>{g.id}</td>
                <td className={`${tdClass} font-semibold`}>
                  {editingId === g.id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={smallInputClass + " w-full"}
                      autoFocus
                    />
                  ) : g.name}
                </td>
                <td className={tdClass}>
                  {editingId === g.id ? (
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={smallInputClass}
                    >
                      <option value="family">family</option>
                      <option value="work">work</option>
                      <option value="other">other</option>
                    </select>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold border bg-[rgba(255,255,255,0.06)] text-text-secondary border-border-subtle">
                      {g.type}
                    </span>
                  )}
                </td>
                <td className={tdClass}>
                  <div className="text-sm">{g.owner_name}</div>
                  <div className="text-xs text-text-muted">{g.owner_phone}</div>
                </td>
                <td className={`${tdClass} text-center`}>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-bg text-accent-green">
                    {g.member_count}
                  </span>
                </td>
                <td className={`${tdClass} text-text-secondary text-xs`}>
                  {formatDate(g.created_at)}
                </td>
                <td className={tdClass}>
                  {editingId === g.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={saveEdit}
                        disabled={updateGroup.isPending}
                        className={`${smallBtnClass} bg-green-bg text-accent-green border-green-border hover:bg-[rgba(34,197,94,0.2)]`}
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className={`${smallBtnClass} bg-[rgba(255,255,255,0.06)] text-text-secondary border-border-subtle hover:bg-[rgba(255,255,255,0.1)]`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => startEdit(g, e)}
                        className={`${smallBtnClass} bg-[rgba(96,165,250,0.1)] text-accent-blue border-blue-border hover:bg-[rgba(96,165,250,0.2)]`}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => handleDelete(g, e)}
                        disabled={deleteGroup.isPending}
                        className={`${smallBtnClass} bg-[rgba(239,68,68,0.1)] text-accent-red border-red-border hover:bg-[rgba(239,68,68,0.2)]`}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// Group Members
// ══════════════════════════════════════════

function AdminGroupMembers({ groupId, onBack }) {
  const { data, isLoading, error } = useAdminGroupMembers(groupId);
  const removeMember = useAdminRemoveMember();
  const deleteUser = useAdminDeleteUser();
  const updateUser = useAdminUpdateUser();
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const handleRemove = (member) => {
    if (!window.confirm(`Remove "${member.name}" from this group?`)) return;
    removeMember.mutate({ groupId, userId: member.id });
  };

  const handleDelete = (member) => {
    if (
      !window.confirm(
        `PERMANENTLY DELETE user "${member.name}" (${member.phone})?\n\nThis removes them from ALL groups and deletes all their data.`
      )
    )
      return;
    deleteUser.mutate({ userId: member.id });
  };

  const startEdit = (m) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditPhone(m.phone);
  };

  const saveEdit = () => {
    updateUser.mutate(
      { userId: editingId, name: editName, phone: editPhone },
      { onSuccess: () => setEditingId(null) }
    );
  };

  if (isLoading) {
    return <div className="text-text-secondary text-sm py-8 text-center">Loading members...</div>;
  }

  if (error) {
    return (
      <div className="text-accent-red text-sm py-8 text-center">
        Error: {error.response?.data?.error || error.message}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.06)] border-none cursor-pointer text-text-secondary text-sm flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)] transition-all"
        >
          ←
        </button>
        <h2 className="text-base font-bold text-text-primary">
          {data?.group?.name} — Members ({data?.members?.length || 0})
        </h2>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border-subtle">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[rgba(255,255,255,0.03)]">
              <th className={thClass}>ID</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Phone</th>
              <th className={thClass}>Role</th>
              <th className={thClass}>Joined</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Last Seen</th>
              <th className={thClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.members?.map((m) => (
              <tr key={m.id} className={rowClass}>
                <td className={`${tdClass} text-text-muted font-mono text-xs`}>{m.id}</td>
                <td className={`${tdClass} font-semibold`}>
                  {editingId === m.id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={smallInputClass + " w-full"}
                      autoFocus
                    />
                  ) : m.name}
                </td>
                <td className={`${tdClass} text-text-secondary text-xs font-mono`}>
                  {editingId === m.id ? (
                    <input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className={smallInputClass + " w-28"}
                    />
                  ) : m.phone}
                </td>
                <td className={tdClass}>{roleBadge(m.role)}</td>
                <td className={`${tdClass} text-text-secondary text-xs`}>
                  {formatDate(m.joined_at)}
                </td>
                <td className={tdClass}>{statusBadge(m.latest_status)}</td>
                <td className={`${tdClass} text-text-secondary text-xs`}>
                  {formatDateTime(m.last_seen)}
                </td>
                <td className={tdClass}>
                  {editingId === m.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={saveEdit}
                        disabled={updateUser.isPending}
                        className={`${smallBtnClass} bg-green-bg text-accent-green border-green-border hover:bg-[rgba(34,197,94,0.2)]`}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className={`${smallBtnClass} bg-[rgba(255,255,255,0.06)] text-text-secondary border-border-subtle hover:bg-[rgba(255,255,255,0.1)]`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(m)}
                        className={`${smallBtnClass} bg-[rgba(96,165,250,0.1)] text-accent-blue border-blue-border hover:bg-[rgba(96,165,250,0.2)]`}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleRemove(m)}
                        disabled={removeMember.isPending}
                        className={`${smallBtnClass} bg-[rgba(234,179,8,0.1)] text-accent-yellow border-yellow-border hover:bg-[rgba(234,179,8,0.2)]`}
                        title="Remove from group"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => handleDelete(m)}
                        disabled={deleteUser.isPending}
                        className={`${smallBtnClass} bg-[rgba(239,68,68,0.1)] text-accent-red border-red-border hover:bg-[rgba(239,68,68,0.2)]`}
                        title="Delete user entirely"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// Main Dashboard
// ══════════════════════════════════════════

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(() => !!getAdminToken());
  const [view, setView] = useState("groups"); // "groups" | "settings"
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  if (!authenticated) {
    return <AdminLogin onLogin={() => setAuthenticated(true)} />;
  }

  const currentView = view === "settings"
    ? <AdminSettingsView onBack={() => setView("groups")} />
    : selectedGroupId
    ? <AdminGroupMembers groupId={selectedGroupId} onBack={() => setSelectedGroupId(null)} />
    : <AdminGroupsList onSelectGroup={setSelectedGroupId} />;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Header */}
      <header className="px-6 py-4 bg-[rgba(255,255,255,0.03)] border-b border-border-subtle flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-green to-accent-green-dark flex items-center justify-center text-base">
            🛡️
          </div>
          <h1 className="text-[15px] font-bold tracking-tight">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://family-safety.vercel.app"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer bg-[rgba(255,255,255,0.06)] text-text-secondary border-border-subtle hover:bg-[rgba(255,255,255,0.1)] transition-all no-underline"
          >
            🏠 App
          </a>
          <button
            onClick={() => {
              setView(view === "settings" ? "groups" : "settings");
              setSelectedGroupId(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
              view === "settings"
                ? "bg-[rgba(34,197,94,0.15)] text-accent-green border-green-border"
                : "bg-[rgba(255,255,255,0.06)] text-text-secondary border-border-subtle hover:bg-[rgba(255,255,255,0.1)]"
            }`}
          >
            ⚙️ Settings
          </button>
          <button
            onClick={() => {
              clearAdminToken();
              setAuthenticated(false);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer bg-[rgba(239,68,68,0.1)] text-accent-red border-red-border hover:bg-[rgba(239,68,68,0.2)] transition-all"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="p-6 max-w-[1200px] mx-auto">
        {currentView}
      </main>
    </div>
  );
}
