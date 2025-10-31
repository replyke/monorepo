/**
 * NotificationItem - Tailwind Variant
 *
 * Individual notification item with avatar, icon, and interactive states.
 * Uses Tailwind CSS for styling with dark mode support.
 *
 * TAILWIND CLASSES USED:
 *
 * BACKGROUNDS:
 * - bg-white dark:bg-gray-800 (main background)
 * - bg-gray-50 dark:bg-gray-700 (avatar, muted backgrounds)
 * - bg-slate-50/80 dark:bg-gray-700/30 (unread notification background)
 * - bg-slate-50/90 dark:bg-gray-700/50 (unread hover)
 * - bg-slate-50/70 dark:bg-gray-700/20 (read hover)
 *
 * TEXT:
 * - text-gray-900 dark:text-gray-100 (primary text)
 * - text-gray-600 dark:text-gray-400 (muted text)
 *
 * BORDERS:
 * - border-gray-200 dark:border-gray-700 (borders)
 *
 * ACCENT (primary):
 * - bg-gray-900 dark:bg-gray-100 (buttons, unread indicator)
 * - text-gray-50 dark:text-gray-900 (button text)
 */
"use client";

import { AppNotification } from "@replyke/react-js";
import { motion } from "framer-motion";
import { formatRelativeTime, truncateText } from "../utils/notification-utils";
import NotificationIcon from "./notification-icon";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NotificationItemProps {
  notification: AppNotification.PotentiallyPopulatedUnifiedAppNotification;
  onNotificationClick?: (
    notification: AppNotification.PotentiallyPopulatedUnifiedAppNotification
  ) => void;
}

function NotificationAvatar({
  src,
  name,
}: {
  src?: string | null;
  name: string;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative shrink-0">
      <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-700">
        {src && !imageError ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium flex items-center justify-center">
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
}: NotificationItemProps) {
  const [isHovered, setIsHovered] = useState(false);

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
      className={cn(
        "relative flex gap-3 p-3 rounded-lg cursor-pointer transition-all",
        !notification.isRead
          ? "bg-slate-50/80 dark:bg-gray-700/30"
          : "bg-transparent",
        isHovered &&
          (!notification.isRead
            ? "bg-slate-50/90 dark:bg-gray-700/50"
            : "bg-slate-50/70 dark:bg-gray-700/20")
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Unread indicator dot */}
      {!notification.isRead && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-gray-900 dark:bg-gray-100 rounded-full" />
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
      />

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p
              data-notification-title
              className={cn(
                "text-sm leading-normal m-0 transition-colors",
                !notification.isRead
                  ? "font-medium text-gray-900 dark:text-gray-100"
                  : "font-normal text-gray-600 dark:text-gray-400",
                isHovered && "text-gray-900 dark:text-gray-100"
              )}
            >
              {notification.title}
            </p>
            {truncatedContent && (
              <p
                data-notification-content
                className={cn(
                  "text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-normal m-0 transition-colors",
                  isHovered && "text-gray-900 dark:text-gray-100"
                )}
              >
                {truncatedContent}
              </p>
            )}
          </div>
          <div className="mt-0.5">
            <NotificationIcon type={notification.type} className="w-6 h-6" />
          </div>
        </div>

        {/* System notification button */}
        {notification.type === "system" && notification.metadata.buttonData && (
          <div className="mt-2 mb-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (notification.metadata.buttonData) {
                  window.open(notification.metadata.buttonData.url, "_blank");
                }
              }}
              className="bg-gray-900 dark:bg-gray-100 text-gray-50 dark:text-gray-900 border-none rounded-md px-3 py-1 text-xs font-medium cursor-pointer transition-all inline-flex items-center justify-center hover:bg-gray-700 dark:hover:bg-gray-300"
            >
              {notification.metadata.buttonData.text}
            </button>
          </div>
        )}

        {/* Time and metadata */}
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <span>{relativeTime}</span>
          {!notification.isRead && (
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              New
            </span>
          )}
        </div>
      </div>

      {/* Hover effect gradient overlay */}
      <div
        className={cn(
          "absolute inset-0 rounded-lg pointer-events-none transition-opacity",
          "bg-gradient-to-r from-transparent to-gray-900/[0.03] dark:to-gray-100/[0.03]",
          isHovered ? "opacity-100" : "opacity-0"
        )}
      />
    </motion.div>
  );
}

export default NotificationItem;
