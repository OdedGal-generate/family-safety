import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import StatusBanner from "./components/StatusBanner";
import SafeButtons from "./components/SafeButtons";
import MembersList from "./components/MembersList";
import SosModal from "./components/SosModal";
import InviteModal from "./components/InviteModal";
import ChecklistScreen from "./components/ChecklistScreen";
import SettingsScreen from "./components/SettingsScreen";
import OnboardingScreen from "./components/OnboardingScreen";
import JoinGroupScreen from "./components/JoinGroupScreen";
import SubGroupsList from "./components/SubGroupsList";
import { useGroupStatus, usePostStatus } from "./api/hooks";
import { isLoggedIn } from "./api/client";
import { subscribeToPush } from "./services/pushNotifications";

const LANGUAGES = ["he", "en", "ar", "fr"];
const ONBOARDED_KEY = "familyShield_onboarded";

function App() {
  const { t, i18n } = useTranslation();
  const [sosOpen, setSosOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  // Onboarding / Join flow state
  const [onboarded, setOnboarded] = useState(() => {
    return isLoggedIn() || localStorage.getItem(ONBOARDED_KEY) === "true";
  });
  const [screen, setScreen] = useState("main"); // "main" | "join"

  // Real data from API (with demo fallback)
  const { data: groupData, isLoading } = useGroupStatus();
  const members = groupData?.members || [];
  const subGroups = groupData?.subGroups || [];

  const postStatus = usePostStatus();

  // Subscribe returning users to push notifications
  useEffect(() => {
    if (onboarded && isLoggedIn()) {
      subscribeToPush().catch(() => {});
    }
  }, [onboarded]);

  const handleSosConfirm = () => {
    setSosOpen(false);
    postStatus.mutate({ status: "sos" });
  };

  const handleCreateGroup = (groupName) => {
    localStorage.setItem(ONBOARDED_KEY, "true");
    setOnboarded(true);
  };

  const handleJoinStart = () => {
    setScreen("join");
  };

  const handleJoinBack = () => {
    setScreen("main");
  };

  const handleJoined = () => {
    localStorage.setItem(ONBOARDED_KEY, "true");
    setOnboarded(true);
    setScreen("main");
  };

  const tabs = [
    { key: "home", icon: "🏠", label: t("dashboard") },
    { key: "checklist", icon: "✅", label: t("shelterChecklist") },
    { key: "settings", icon: "⚙️", label: t("settings") },
  ];

  // Show onboarding if not yet onboarded
  if (!onboarded) {
    if (screen === "join") {
      return <JoinGroupScreen onBack={handleJoinBack} onJoined={handleJoined} />;
    }
    return (
      <OnboardingScreen
        onCreateGroup={handleCreateGroup}
        onJoinGroup={handleJoinStart}
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary max-w-[420px] mx-auto relative">
      {/* Glow effect */}
      <div className="fixed top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.08)_0%,transparent_70%)] pointer-events-none z-0" />

      {/* Header */}
      <header className="px-5 pt-4 pb-3 bg-[rgba(255,255,255,0.03)] backdrop-blur-[20px] border-b border-border-light flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-accent-green to-accent-green-dark flex items-center justify-center text-lg shadow-[0_0_20px_rgba(34,197,94,0.4)]">
            🛡️
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-tight">
              {t("appName")}
            </div>
            <div className="text-[11px] text-text-secondary">
              {t("tagline")}
            </div>
          </div>
        </div>

        <div className="flex gap-1">
          {LANGUAGES.map((lng) => (
            <button
              key={lng}
              onClick={() => i18n.changeLanguage(lng)}
              className={`px-2 py-1 rounded-md border-none cursor-pointer text-[11px] font-semibold transition-all ${
                i18n.language === lng
                  ? "bg-green-active text-accent-green"
                  : "bg-[rgba(255,255,255,0.05)] text-text-secondary"
              }`}
            >
              {lng.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="pb-20 relative z-[1]">
        {activeTab === "home" && (
          <>
            <StatusBanner members={members} subGroups={subGroups} />
            <SafeButtons onSosClick={() => setSosOpen(true)} />
            <MembersList
              members={members}
              onInviteClick={() => setInviteOpen(true)}
            />
            <SubGroupsList subGroups={subGroups} />
          </>
        )}
        {activeTab === "checklist" && <ChecklistScreen />}
        {activeTab === "settings" && <SettingsScreen />}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-nav-bg backdrop-blur-[20px] border-t border-border-light flex z-50">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 px-2 border-none bg-transparent cursor-pointer flex flex-col items-center gap-0.5 transition-all ${
              activeTab === tab.key ? "text-accent-green" : "text-text-muted"
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* SOS Modal */}
      <SosModal
        open={sosOpen}
        onClose={() => setSosOpen(false)}
        onConfirm={handleSosConfirm}
      />

      {/* Invite Modal */}
      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </div>
  );
}

export default App;
