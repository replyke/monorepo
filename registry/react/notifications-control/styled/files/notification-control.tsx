"use client";

import React, { useState, useRef, useEffect } from "react";
import { AppNotification, useAppNotifications } from "@replyke/react-js";
import { CheckCheck } from "lucide-react";
import NotificationList from "./notification-list";

function NotificationControl({
  notificationTemplates,
  onViewAllNotifications,
  onNotificationClick,
  triggerComponent,
  theme = "auto",
}: {
  notificationTemplates?: AppNotification.NotificationTemplates;
  onViewAllNotifications?: () => void;
  onNotificationClick: (
    notification: AppNotification.PotentiallyPopulatedUnifiedAppNotification
  ) => void;
  triggerComponent: React.ComponentType<{ unreadCount: number }>;
  theme?: "auto" | "light" | "dark";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    position: "absolute" as "absolute" | "fixed",
    top: "100%",
    right: 0 as number | string,
    left: "auto" as number | string,
    marginTop: "8px",
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const {
    appNotifications,
    unreadAppNotificationsCount,
    loading,
    hasMore,
    loadMore,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useAppNotifications({
    limit: 10,
    notificationTemplates,
  });

  // Close dropdown when clicking outside and handle window resize
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleResize = () => {
      if (isOpen) {
        const position = calculateDropdownPosition();
        setDropdownPosition(position);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", handleResize);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  // Calculate optimal dropdown position based on trigger position and viewport
  const calculateDropdownPosition = () => {
    if (!triggerRef.current) {
      return {
        position: "absolute" as const,
        top: "100%",
        right: 0 as number | string,
        left: "auto" as number | string,
        marginTop: "8px",
      };
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const dropdownWidth = Math.min(
      400,
      viewportWidth <= 768 ? viewportWidth - 32 : 400
    );
    const padding = 16;

    // Mobile devices: use fixed positioning for better control
    if (viewportWidth <= 768) {
      const triggerBottom = triggerRect.bottom;
      const triggerRight = triggerRect.right;

      // Calculate left position to ensure dropdown stays in viewport
      let leftPosition = triggerRight - dropdownWidth;

      // Ensure dropdown doesn't go off left edge
      if (leftPosition < padding) {
        leftPosition = padding;
      }

      // Ensure dropdown doesn't go off right edge
      if (leftPosition + dropdownWidth > viewportWidth - padding) {
        leftPosition = viewportWidth - dropdownWidth - padding;
      }

      return {
        position: "fixed" as const,
        top: `${triggerBottom + 8}px`,
        left: `${leftPosition}px`,
        right: "auto" as number | string,
        marginTop: "0px",
      };
    }

    // Desktop: use absolute positioning with proper boundary checking
    const triggerRight = triggerRect.right;
    const triggerLeft = triggerRect.left;

    // Calculate if dropdown would overflow when aligned to right edge of trigger
    const wouldOverflowRight = triggerRight + padding > viewportWidth;

    // If dropdown would overflow on the right, or if trigger is too close to right edge
    if (wouldOverflowRight || triggerRight - dropdownWidth < padding) {
      // Try aligning to left edge of trigger
      if (triggerLeft + dropdownWidth + padding <= viewportWidth) {
        return {
          position: "absolute" as const,
          top: "100%",
          right: "auto" as number | string,
          left: 0 as number | string,
          marginTop: "8px",
        };
      } else {
        // If both alignments would overflow, use fixed positioning like mobile
        const maxLeft = viewportWidth - dropdownWidth - padding;
        const idealLeft = Math.max(
          padding,
          Math.min(maxLeft, triggerRight - dropdownWidth)
        );

        return {
          position: "fixed" as const,
          top: `${triggerRect.bottom + 8}px`,
          left: `${idealLeft}px`,
          right: "auto" as number | string,
          marginTop: "0px",
        };
      }
    }

    // Default: align to right edge (dropdown's right edge aligns with trigger's right edge)
    return {
      position: "absolute" as const,
      top: "100%",
      right: 0 as number | string,
      left: "auto" as number | string,
      marginTop: "8px",
    };
  };

  const handleMarkAsRead = (notificationId: string) => {
    markNotificationAsRead(notificationId);
  };

  const handleNotificationClick = (
    notification: AppNotification.UnifiedAppNotification
  ) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    onNotificationClick(notification);
  };

  const TriggerComponent = triggerComponent;

  // Simple dark theme detection
  const isDarkTheme =
    theme === "auto"
      ? typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-color-scheme: dark)").matches
      : theme === "dark";

  // Theme-aware colors
  const colors = {
    background: isDarkTheme ? "oklch(0.205 0 0)" : "#ffffff",
    border: isDarkTheme ? "oklch(1 0 0 / 10%)" : "#e5e7eb",
    text: isDarkTheme ? "oklch(0.985 0 0)" : "#0f172a",
    textMuted: isDarkTheme ? "oklch(0.708 0 0)" : "#64748b",
    separator: isDarkTheme ? "oklch(1 0 0 / 10%)" : "#f1f5f9", // Much lighter separator for light theme
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Trigger */}
      <div
        ref={triggerRef}
        onClick={() => {
          if (!isOpen) {
            const position = calculateDropdownPosition();
            setDropdownPosition(position);
          }
          setIsOpen(!isOpen);
        }}
        style={{ cursor: "pointer" }}
      >
        <TriggerComponent unreadCount={unreadAppNotificationsCount} />
      </div>

      {/* Dropdown Content */}
      {isOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: dropdownPosition.position,
            top: dropdownPosition.top,
            right: dropdownPosition.right,
            left: dropdownPosition.left,
            marginTop: dropdownPosition.marginTop,
            width:
              typeof window !== "undefined" && window.innerWidth <= 768
                ? `${Math.min(400, window.innerWidth - 32)}px`
                : "400px",
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: "10px",
            boxShadow:
              "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            zIndex: 60,
            padding: 0,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 16px 8px 16px",
            }}
          >
            <h2
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: colors.text,
                margin: 0,
              }}
            >
              Notifications
              {unreadAppNotificationsCount > 0 && (
                <span
                  style={{
                    marginLeft: "8px",
                    fontSize: "12px",
                    color: colors.textMuted,
                  }}
                >
                  ({unreadAppNotificationsCount} new)
                </span>
              )}
            </h2>

            {unreadAppNotificationsCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "4px",
                  fontSize: "12px",
                  color: colors.textMuted,
                  cursor: "pointer",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = colors.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = colors.textMuted;
                }}
              >
                <CheckCheck
                  style={{ width: "12px", height: "12px", marginRight: "4px" }}
                />
                Mark all read
              </button>
            )}
          </div>

          {/* Separator */}
          <div
            style={{
              height: "1px",
              backgroundColor: colors.separator,
              margin: "0 16px",
            }}
          />

          {/* Notification List */}
          <div style={{ maxHeight: "500px" }}>
            <NotificationList
              notifications={appNotifications}
              loading={loading}
              hasMore={hasMore}
              onLoadMore={loadMore}
              onNotificationClick={handleNotificationClick}
              isDarkTheme={isDarkTheme}
            />
          </div>

          {/* Footer (optional) */}
          {appNotifications.length > 0 &&
            !loading &&
            onViewAllNotifications && (
              <>
                {/* Separator */}
                <div
                  style={{
                    height: "1px",
                    backgroundColor: colors.separator,
                    margin: "0 16px",
                  }}
                />
                <div style={{ padding: "12px" }}>
                  <button
                    onClick={onViewAllNotifications}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      padding: "8px",
                      fontSize: "12px",
                      color: colors.textMuted,
                      cursor: "pointer",
                      borderRadius: "4px",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = colors.text;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = colors.textMuted;
                    }}
                  >
                    View all notifications
                  </button>
                </div>
              </>
            )}
        </div>
      )}
    </div>
  );
}

export default NotificationControl;
