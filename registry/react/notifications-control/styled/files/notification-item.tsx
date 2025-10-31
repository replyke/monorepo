"use client";

import { AppNotification } from "@replyke/react-js";
import { motion } from "framer-motion";
import { formatRelativeTime, truncateText } from "../utils/notification-utils";
import NotificationIcon from "./notification-icon";

// Comprehensive color system
const getColors = (isDark = false) => ({
  background: isDark ? "oklch(0.145 0 0)" : "#ffffff",
  foreground: isDark ? "oklch(0.985 0 0)" : "#0f172a",
  muted: isDark ? "oklch(0.269 0 0)" : "#f8fafc", // Much lighter avatar background
  mutedForeground: isDark ? "oklch(0.708 0 0)" : "#64748b",
  border: isDark ? "oklch(1 0 0 / 10%)" : "#f1f5f9", // Much lighter border
  accent: isDark ? "oklch(0.269 0 0)" : "#f8fafc", // Much lighter accent
  accentForeground: isDark ? "oklch(0.985 0 0)" : "#0f172a",
  primary: isDark ? "oklch(0.985 0 0)" : "#0f172a",
  primaryForeground: isDark ? "oklch(0.205 0 0)" : "#f8fafc",
  card: isDark ? "oklch(0.205 0 0)" : "#ffffff",
  cardForeground: isDark ? "oklch(0.985 0 0)" : "#0f172a",
  // Unread notification background - using neutral colors instead of blue
  unreadBackground: isDark
    ? "oklch(0.269 0 0 / 0.3)"
    : "rgba(248, 250, 252, 0.8)",
  unreadBackgroundHover: isDark
    ? "oklch(0.269 0 0 / 0.5)"
    : "rgba(248, 250, 252, 0.9)",
  // Hover background for read notifications - much more subtle
  hoverBackground: isDark
    ? "oklch(0.269 0 0 / 0.2)"
    : "rgba(248, 250, 252, 0.7)",
});

interface NotificationItemProps {
  notification: AppNotification.PotentiallyPopulatedUnifiedAppNotification;
  onNotificationClick?: (
    notification: AppNotification.PotentiallyPopulatedUnifiedAppNotification
  ) => void;
  isDarkTheme: boolean;
}

function NotificationAvatar({
  src,
  name,
  isDarkTheme,
}: {
  src?: string | null;
  name: string;
  isDarkTheme: boolean;
}) {
  const colors = getColors(isDarkTheme);

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
          backgroundColor: colors.muted,
        }}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<div style="width: 100%; height: 100%; background-color: ${
                  colors.accent
                }; color: ${
                  colors.accentForeground
                }; font-size: 14px; font-weight: 500; display: flex; align-items: center; justify-content: center;">${name
                  .charAt(0)
                  .toUpperCase()}</div>`;
              }
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: colors.accent,
              color: colors.accentForeground,
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationItem({
  notification,
  onNotificationClick,
  isDarkTheme,
}: NotificationItemProps) {
  const colors = getColors(isDarkTheme);

  const relativeTime = formatRelativeTime(notification.createdAt);
  const truncatedContent = truncateText(notification.content || "", 80);

  const handleClick = () => {
    onNotificationClick?.(notification);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "relative",
        display: "flex",
        gap: "12px",
        padding: "12px",
        borderRadius: "8px",
        cursor: "pointer",
        transition: "all 0.2s",
        backgroundColor: !notification.isRead
          ? colors.unreadBackground
          : "transparent",
      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = !notification.isRead
          ? colors.unreadBackgroundHover
          : colors.hoverBackground;

        // Make text more prominent on hover
        const titleElement = e.currentTarget.querySelector(
          "[data-notification-title]"
        ) as HTMLElement;
        const contentElement = e.currentTarget.querySelector(
          "[data-notification-content]"
        ) as HTMLElement;

        if (titleElement) {
          titleElement.style.color = colors.foreground;
        }
        if (contentElement) {
          contentElement.style.color = colors.foreground;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = !notification.isRead
          ? colors.unreadBackground
          : "transparent";

        // Reset text colors on mouse leave
        const titleElement = e.currentTarget.querySelector(
          "[data-notification-title]"
        ) as HTMLElement;
        const contentElement = e.currentTarget.querySelector(
          "[data-notification-content]"
        ) as HTMLElement;

        if (titleElement) {
          titleElement.style.color = !notification.isRead
            ? colors.foreground
            : colors.mutedForeground;
        }
        if (contentElement) {
          contentElement.style.color = colors.mutedForeground;
        }
      }}
    >
      {/* Unread indicator dot */}
      {!notification.isRead && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: isDarkTheme ? "oklch(0.922 0 0)" : "#0f172a",
              borderRadius: "50%",
            }}
          />
        </div>
      )}

      {/* Avatar */}
      <NotificationAvatar
        src={
          notification.type === "system"
            ? null
            : notification.metadata.initiatorAvatar
        }
        name={"initiatorName"}
        isDarkTheme={isDarkTheme}
      />

      {/* Content */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <p
              data-notification-title
              style={{
                fontSize: "14px",
                lineHeight: "1.4",
                fontWeight: !notification.isRead ? "500" : "400",
                color: !notification.isRead
                  ? colors.foreground
                  : colors.mutedForeground,
                margin: 0,
                transition: "color 0.2s",
              }}
            >
              {notification.title}
            </p>
            {truncatedContent && (
              <p
                data-notification-content
                style={{
                  fontSize: "12px",
                  color: colors.mutedForeground,
                  marginTop: "2px",
                  lineHeight: "1.4",
                  margin: 0,
                  transition: "color 0.2s",
                }}
              >
                {truncatedContent}
              </p>
            )}
          </div>
          <div style={{ marginTop: "2px" }}>
            <NotificationIcon
              type={notification.type}
              style={{ width: "24px", height: "24px" }}
              isDarkTheme={isDarkTheme}
            />
          </div>
        </div>

        {/* System notification button */}
        {notification.type === "system" && notification.metadata.buttonData && (
          <div style={{ marginTop: "8px", marginBottom: "4px" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (notification.metadata.buttonData) {
                  window.open(notification.metadata.buttonData.url, "_blank");
                }
              }}
              style={{
                backgroundColor: colors.primary,
                color: colors.primaryForeground,
                border: "none",
                borderRadius: "6px",
                padding: "4px 12px",
                fontSize: "12px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDarkTheme
                  ? "oklch(0.922 0 0)"
                  : "#374151";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.primary;
              }}
            >
              {notification.metadata.buttonData.text}
            </button>
          </div>
        )}

        {/* Time and metadata */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            color: colors.mutedForeground,
          }}
        >
          <span>{relativeTime}</span>
          {!notification.isRead && (
            <span
              style={{
                color: colors.primary,
                fontWeight: "500",
              }}
            >
              New
            </span>
          )}
        </div>
      </div>

      {/* Hover effect gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "8px",
          background: `linear-gradient(to right, transparent, ${colors.primary}08)`,
          opacity: 0,
          transition: "opacity 0.2s",
          pointerEvents: "none",
        }}
        className="hover-gradient"
      />
    </motion.div>
  );
}

export default NotificationItem;
