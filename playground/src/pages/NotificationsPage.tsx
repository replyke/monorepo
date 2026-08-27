import React, { useState } from "react";
import { Bell } from "lucide-react";
import NotificationControlStyled from "../../../registry/react/notifications-control/styled/files/notification-control";
import NotificationControlTailwind from "../../../registry/react/notifications-control/tailwind/files/notification-control";

type StyleVariant = "styled" | "tailwind";

function BellTrigger({ unreadCount }: { unreadCount: number }) {
  return (
    <div style={{
      position: "relative", display: "inline-flex", alignItems: "center",
      justifyContent: "center", width: 40, height: 40, borderRadius: 8,
      border: "1px solid #e5e7eb", cursor: "pointer", background: "#fff",
    }}>
      <Bell size={20} color="#374151" />
      {unreadCount > 0 && (
        <span style={{
          position: "absolute", top: 4, right: 4, background: "#ef4444", color: "#fff",
          borderRadius: "50%", width: 16, height: 16, fontSize: 10,
          display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
        }}>
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const [variant, setVariant] = useState<StyleVariant>("styled");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const sharedProps = {
    triggerComponent: BellTrigger,
    onNotificationClick: (n: unknown) => console.log("Notification clicked:", n),
    onViewAllNotifications: () => console.log("View all"),
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>notifications-control</h2>
        <VariantToggle value={variant} onChange={setVariant} />
        {variant === "styled" && <ThemeToggle value={theme} onChange={setTheme} />}
      </div>

      <p style={{ marginBottom: 24, fontSize: 13, color: "#6b7280" }}>
        Click the bell to open the dropdown. Requires an authenticated mock user to load notifications.
      </p>

      <div className={theme === "dark" ? "dark" : ""} style={{ display: "inline-block" }}>
        {variant === "styled" ? (
          <NotificationControlStyled {...sharedProps} theme={theme} />
        ) : (
          <NotificationControlTailwind {...sharedProps} />
        )}
      </div>
    </div>
  );
}

function VariantToggle({ value, onChange }: { value: StyleVariant; onChange: (v: StyleVariant) => void }) {
  return (
    <div style={{ display: "flex", gap: 2, background: "#f3f4f6", borderRadius: 6, padding: 2 }}>
      {(["styled", "tailwind"] as const).map((v) => (
        <button key={v} onClick={() => onChange(v)} style={{
          padding: "3px 10px", borderRadius: 5, border: "none",
          background: value === v ? "#fff" : "transparent",
          boxShadow: value === v ? "0 1px 2px rgba(0,0,0,.1)" : "none",
          color: value === v ? "#111" : "#6b7280", cursor: "pointer", fontSize: 13, fontWeight: value === v ? 600 : 400,
        }}>
          {v}
        </button>
      ))}
    </div>
  );
}

function ThemeToggle({ value, onChange }: { value: "light" | "dark"; onChange: (v: "light" | "dark") => void }) {
  return (
    <button onClick={() => onChange(value === "light" ? "dark" : "light")} style={{
      marginLeft: "auto", padding: "4px 12px", borderRadius: 6, border: "1px solid #d1d5db",
      background: value === "dark" ? "#1f2937" : "#fff",
      color: value === "dark" ? "#f9fafb" : "#374151", cursor: "pointer", fontSize: 13,
    }}>
      {value === "light" ? "☀ Light" : "☾ Dark"}
    </button>
  );
}
