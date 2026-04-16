import React, { useState } from "react";
import { useAuth } from "./context/use-auth";
import SocialCommentsPage from "./pages/SocialCommentsPage";
import ThreadedCommentsPage from "./pages/ThreadedCommentsPage";
import NotificationsPage from "./pages/NotificationsPage";

type Page = "social" | "threaded" | "notifications";

const tabs: { id: Page; label: string }[] = [
  { id: "social", label: "Comments — Social" },
  { id: "threaded", label: "Comments — Threaded" },
  { id: "notifications", label: "Notifications" },
];

function UserBar() {
  const { user, setUsername, generateRandomUsername, clearUsername } = useAuth();

  const handleSetRandom = () => {
    setUsername(generateRandomUsername());
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 16px",
        background: "#f0fdf4",
        borderBottom: "1px solid #bbf7d0",
        fontSize: 13,
      }}
    >
      <span style={{ color: "#166534", fontWeight: 600 }}>Mock user:</span>
      {user ? (
        <>
          <span
            style={{
              fontFamily: "monospace",
              background: "#dcfce7",
              padding: "2px 8px",
              borderRadius: 4,
              color: "#15803d",
            }}
          >
            @{user.username}
          </span>
          <button onClick={handleSetRandom} style={btnStyle}>
            Randomize
          </button>
          <button onClick={clearUsername} style={{ ...btnStyle, color: "#b91c1c", borderColor: "#fca5a5" }}>
            Sign out
          </button>
        </>
      ) : (
        <>
          <span style={{ color: "#6b7280" }}>Not signed in — read-only</span>
          <button onClick={handleSetRandom} style={btnStyle}>
            Sign in with random user
          </button>
        </>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "3px 10px",
  borderRadius: 5,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  fontSize: 12,
};

export default function App() {
  const [activePage, setActivePage] = useState<Page>("social");

  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh" }}>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "12px 16px",
          borderBottom: "1px solid #e5e7eb",
          background: "#f9fafb",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePage(tab.id)}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: "1px solid",
              borderColor: activePage === tab.id ? "#3b82f6" : "#d1d5db",
              background: activePage === tab.id ? "#3b82f6" : "#fff",
              color: activePage === tab.id ? "#fff" : "#374151",
              cursor: "pointer",
              fontWeight: activePage === tab.id ? 600 : 400,
              fontSize: 14,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mock user controls */}
      <UserBar />

      {/* Page content */}
      <div style={{ padding: "24px 16px" }}>
        {activePage === "social" && <SocialCommentsPage />}
        {activePage === "threaded" && <ThreadedCommentsPage />}
        {activePage === "notifications" && <NotificationsPage />}
      </div>
    </div>
  );
}
