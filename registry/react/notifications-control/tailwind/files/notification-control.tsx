/**
 * NotificationControl - Tailwind Variant
 *
 * Notification dropdown control with real-time updates, infinite scroll, and theme support.
 * Uses Tailwind CSS for styling with dark mode support.
 *
 * TAILWIND CONFIGURATION:
 * Requires tailwind.config.js with:
 * ```js
 * module.exports = {
 *   darkMode: 'class',
 *   // ... other config
 * }
 * ```
 *
 * USAGE:
 * Wrap your app with a div that has the 'dark' class when in dark mode:
 * ```tsx
 * <div className={isDarkMode ? 'dark' : ''}>
 *   <NotificationControl
 *     triggerComponent={MyTrigger}
 *     onNotificationClick={handleClick}
 *   />
 * </div>
 * ```
 *
 * TAILWIND CLASSES USED:
 *
 * BACKGROUNDS:
 * - bg-white dark:bg-gray-900 (dropdown background)
 * - bg-gray-50 dark:bg-gray-800 (hover states)
 *
 * TEXT:
 * - text-gray-900 dark:text-gray-100 (primary text)
 * - text-gray-600 dark:text-gray-400 (muted text)
 *
 * BORDERS:
 * - border-gray-200 dark:border-gray-700 (borders, dividers)
 */
"use client";

import React, { useState, useRef, useEffect } from "react";
import { AppNotification, useAppNotifications } from "@replyke/react-js";
import { CheckCheck } from "lucide-react";
import NotificationList from "./notification-list";
import { cn } from "@/lib/utils";

function NotificationControl({
  notificationTemplates,
  onViewAllNotifications,
  onNotificationClick,
  triggerComponent,
}: {
  notificationTemplates?: AppNotification.NotificationTemplates;
  onViewAllNotifications?: () => void;
  onNotificationClick: (
    notification: AppNotification.PotentiallyPopulatedUnifiedAppNotification
  ) => void;
  triggerComponent: React.ComponentType<{ unreadCount: number }>;
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

  return (
    <div className="relative inline-block">
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
        className="cursor-pointer"
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
          }}
          className={cn(
            "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700",
            "rounded-[10px] shadow-lg z-[60] p-0"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 m-0">
              Notifications
              {unreadAppNotificationsCount > 0 && (
                <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                  ({unreadAppNotificationsCount} new)
                </span>
              )}
            </h2>

            {unreadAppNotificationsCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className={cn(
                  "bg-transparent border-none p-1 text-xs text-gray-600 dark:text-gray-400",
                  "cursor-pointer rounded flex items-center transition-colors",
                  "hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Mark all read
              </button>
            )}
          </div>

          {/* Separator */}
          <div className="h-px bg-gray-200 dark:bg-gray-700 mx-4" />

          {/* Notification List */}
          <div className="max-h-[500px]">
            <NotificationList
              notifications={appNotifications}
              loading={loading}
              hasMore={hasMore}
              onLoadMore={loadMore}
              onNotificationClick={handleNotificationClick}
            />
          </div>

          {/* Footer (optional) */}
          {appNotifications.length > 0 &&
            !loading &&
            onViewAllNotifications && (
              <>
                {/* Separator */}
                <div className="h-px bg-gray-200 dark:bg-gray-700 mx-4" />
                <div className="p-3">
                  <button
                    onClick={onViewAllNotifications}
                    className={cn(
                      "w-full bg-transparent border-none p-2 text-xs text-gray-600 dark:text-gray-400",
                      "cursor-pointer rounded transition-colors",
                      "hover:text-gray-900 dark:hover:text-gray-100"
                    )}
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
