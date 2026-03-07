import { useState } from "react";
import { getAdminKey, saveAdminKey, clearAdminKey } from "../api/adminClient";
import {
  useAdminGroups,
  useAdminGroupMembers,
  useAdminRemoveMember,
  useAdminDeleteUser,
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

// ── Table styles ──

const thClass =
  "px-4 py-3 text-start text-[11px] font-bold text-text-muted uppercase tracking-wider";
const tdClass = "px-4 py-3 text-sm text-text-primary";
const rowClass =
  "border-b border-border-subtle hover:bg-[rgba(255,255,255,0.03)] transition-colors";

// ── Login Screen ──

function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === "admin-2024") {
      saveAdminKey(password);
      onLogin();
    } else {
      setError("Invalid password");
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[360px] mx-4 bg-modal-bg rounded-2xl border border-border-subtle p-8"
      >
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-accent-green to-accent-green-dark flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(34,197,94,0.3)] mb-4">
            🛡️
          </div>
          <h1 className="text-lg font-bold text-text-primary">Admin Dashboard</h1>
          <p className="text-xs text-text-secondary mt-1">Enter admin password</p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(""); }}
          placeholder="Password"
          autoFocus
          className="w-full py-3 px-4 rounded-xl bg-[rgba(255,255,255,0.04)] border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-green-border transition-all mb-3"
        />

        {error && (
          <div className="text-accent-red text-xs text-center mb-3">{error}</div>
        )}

        <button
          type="submit"
          className="w-full py-3 rounded-xl border-none cursor-pointer font-bold text-sm bg-gradient-to-r from-accent-green to-accent-green-dark text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.45)] transition-all"
        >
          Login
        </button>
      </form>
    </div>
  );
}

// ── Groups List ──

function AdminGroupsList({ onSelectGroup }) {
  const { data: groups, isLoading, error } = useAdminGroups();

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
            </tr>
          </thead>
          <tbody>
            {groups?.map((g) => (
              <tr
                key={g.id}
                onClick={() => onSelectGroup(g.id)}
                className={`${rowClass} cursor-pointer`}
              >
                <td className={`${tdClass} text-text-muted font-mono text-xs`}>{g.id}</td>
                <td className={`${tdClass} font-semibold`}>{g.name}</td>
                <td className={tdClass}>
                  <span className="px-2 py-0.5 rounded-md text-xs font-semibold border bg-[rgba(255,255,255,0.06)] text-text-secondary border-border-subtle">
                    {g.type}
                  </span>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Group Members ──

function AdminGroupMembers({ groupId, onBack }) {
  const { data, isLoading, error } = useAdminGroupMembers(groupId);
  const removeMember = useAdminRemoveMember();
  const deleteUser = useAdminDeleteUser();

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
                <td className={`${tdClass} font-semibold`}>{m.name}</td>
                <td className={`${tdClass} text-text-secondary text-xs font-mono`}>{m.phone}</td>
                <td className={tdClass}>{roleBadge(m.role)}</td>
                <td className={`${tdClass} text-text-secondary text-xs`}>
                  {formatDate(m.joined_at)}
                </td>
                <td className={tdClass}>{statusBadge(m.latest_status)}</td>
                <td className={`${tdClass} text-text-secondary text-xs`}>
                  {formatDateTime(m.last_seen)}
                </td>
                <td className={tdClass}>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRemove(m)}
                      disabled={removeMember.isPending}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer bg-[rgba(234,179,8,0.1)] text-accent-yellow border-yellow-border hover:bg-[rgba(234,179,8,0.2)] transition-all disabled:opacity-50"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => handleDelete(m)}
                      disabled={deleteUser.isPending}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer bg-[rgba(239,68,68,0.1)] text-accent-red border-red-border hover:bg-[rgba(239,68,68,0.2)] transition-all disabled:opacity-50"
                    >
                      Delete User
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Dashboard ──

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(() => !!getAdminKey());
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  if (!authenticated) {
    return <AdminLogin onLogin={() => setAuthenticated(true)} />;
  }

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
        <button
          onClick={() => {
            clearAdminKey();
            setAuthenticated(false);
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer bg-[rgba(239,68,68,0.1)] text-accent-red border-red-border hover:bg-[rgba(239,68,68,0.2)] transition-all"
        >
          Logout
        </button>
      </header>

      {/* Content */}
      <main className="p-6 max-w-[1200px] mx-auto">
        {selectedGroupId ? (
          <AdminGroupMembers
            groupId={selectedGroupId}
            onBack={() => setSelectedGroupId(null)}
          />
        ) : (
          <AdminGroupsList onSelectGroup={setSelectedGroupId} />
        )}
      </main>
    </div>
  );
}
