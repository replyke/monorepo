"use client";

import { motion } from "framer-motion";
import { Loader2, Bell } from "lucide-react";
import NotificationItem from "./notification-item";
import { AppNotification } from "@replyke/react-js";

// Add CSS animations as a style tag
const styles = `
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

// Inject styles into head
if (typeof document !== "undefined") {
  const existingStyle = document.getElementById("notification-list-styles");
  if (!existingStyle) {
    const styleElement = document.createElement("style");
    styleElement.id = "notification-list-styles";
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
}

// Comprehensive color system
const getColors = (isDark = false) => ({
  background: isDark ? "oklch(0.145 0 0)" : "#ffffff",
  foreground: isDark ? "oklch(0.985 0 0)" : "#0f172a",
  muted: isDark ? "oklch(0.269 0 0)" : "#f8fafc", // Much lighter for light theme
  mutedForeground: isDark ? "oklch(0.708 0 0)" : "#64748b",
  border: isDark ? "oklch(1 0 0 / 10%)" : "#f1f5f9", // Much lighter separator
  accent: isDark ? "oklch(0.269 0 0)" : "#f8fafc", // Lighter accent
  accentForeground: isDark ? "oklch(0.985 0 0)" : "#0f172a",
  primary: isDark ? "oklch(0.985 0 0)" : "#0f172a",
  primaryForeground: isDark ? "oklch(0.205 0 0)" : "#f8fafc",
  card: isDark ? "oklch(0.205 0 0)" : "#ffffff",
  cardForeground: isDark ? "oklch(0.985 0 0)" : "#0f172a",
  popover: isDark ? "oklch(0.205 0 0)" : "#ffffff",
  popoverForeground: isDark ? "oklch(0.985 0 0)" : "#0f172a",
});

interface NotificationListProps {
  notifications: AppNotification.PotentiallyPopulatedUnifiedAppNotification[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onNotificationClick?: (
    notification: AppNotification.PotentiallyPopulatedUnifiedAppNotification
  ) => void;
  isDarkTheme: boolean;
}

function NotificationSkeleton({ isDarkTheme }: { isDarkTheme: boolean }) {
  const colors = getColors(isDarkTheme);

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        padding: "12px",
      }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          backgroundColor: colors.muted,
          borderRadius: "50%",
          flexShrink: 0,
          animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        }}
      />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div
          style={{
            height: "12px",
            backgroundColor: colors.muted,
            borderRadius: "4px",
            width: "75%",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
        <div
          style={{
            height: "8px",
            backgroundColor: colors.muted,
            borderRadius: "4px",
            width: "50%",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
        <div
          style={{
            height: "8px",
            backgroundColor: colors.muted,
            borderRadius: "4px",
            width: "25%",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
      </div>
      <div
        style={{
          width: "24px",
          height: "24px",
          backgroundColor: colors.muted,
          borderRadius: "50%",
          flexShrink: 0,
          marginTop: "2px",
          animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        }}
      />
    </div>
  );
}

function EmptyState({ isDarkTheme }: { isDarkTheme: boolean }) {
  const colors = getColors(isDarkTheme);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          backgroundColor: colors.muted,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
        }}
      >
        <Bell
          style={{
            width: "32px",
            height: "32px",
            color: colors.mutedForeground,
          }}
        />
      </div>
      <h3
        style={{
          fontSize: "14px",
          fontWeight: "500",
          color: colors.foreground,
          marginBottom: "8px",
          margin: 0,
        }}
      >
        No notifications yet
      </h3>
      <p
        style={{
          fontSize: "12px",
          color: colors.mutedForeground,
          maxWidth: "200px",
          lineHeight: "1.5",
          margin: 0,
        }}
      >
        When you get new comments, mentions, or follows, they'll appear here.
      </p>
    </motion.div>
  );
}

function LoadingState({ isDarkTheme }: { isDarkTheme: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <NotificationSkeleton key={i} isDarkTheme={isDarkTheme} />
      ))}
    </div>
  );
}

function NotificationList({
  notifications,
  loading,
  hasMore,
  onLoadMore,
  onNotificationClick,
  isDarkTheme,
}: NotificationListProps) {
  const colors = getColors(isDarkTheme);

  // Show loading state for initial load
  if (loading && notifications.length === 0) {
    return <LoadingState isDarkTheme={isDarkTheme} />;
  }

  // Show empty state when no notifications
  if (!loading && notifications.length === 0) {
    return <EmptyState isDarkTheme={isDarkTheme} />;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "400px",
      }}
    >
      {/* Custom scroll area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            padding: "4px",
          }}
        >
          {notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.2,
                delay: index * 0.05,
              }}
            >
              <NotificationItem
                notification={notification}
                onNotificationClick={onNotificationClick}
                isDarkTheme={isDarkTheme}
              />
              {index < notifications.length - 1 && (
                <div
                  style={{
                    height: "1px",
                    backgroundColor: colors.border,
                    margin: "0 12px",
                  }}
                />
              )}
            </motion.div>
          ))}

          {/* Load more section */}
          {(hasMore || loading) && (
            <div style={{ padding: "12px" }}>
              <div
                style={{
                  height: "1px",
                  backgroundColor: colors.border,
                  marginBottom: "12px",
                }}
              />
              {loading ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "8px 0",
                  }}
                >
                  <Loader2
                    style={{
                      width: "16px",
                      height: "16px",
                      color: colors.mutedForeground,
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "14px",
                      color: colors.mutedForeground,
                    }}
                  >
                    Loading more...
                  </span>
                </div>
              ) : (
                <button
                  onClick={onLoadMore}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    padding: "8px",
                    fontSize: "14px",
                    color: colors.mutedForeground,
                    cursor: "pointer",
                    borderRadius: "4px",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = colors.foreground;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = colors.mutedForeground;
                  }}
                >
                  Load more notifications
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationList;
