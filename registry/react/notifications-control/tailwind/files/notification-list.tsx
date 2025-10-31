/**
 * NotificationList - Tailwind Variant
 *
 * Notification list with infinite scroll, loading and empty states.
 * Uses Tailwind CSS for styling with dark mode support.
 *
 * TAILWIND CLASSES USED:
 *
 * BACKGROUNDS:
 * - bg-white dark:bg-gray-800 (main background)
 * - bg-gray-50 dark:bg-gray-700 (muted backgrounds, skeletons)
 *
 * TEXT:
 * - text-gray-900 dark:text-gray-100 (primary text)
 * - text-gray-600 dark:text-gray-400 (muted text)
 *
 * BORDERS:
 * - border-gray-200 dark:border-gray-700 (dividers)
 *
 * ANIMATIONS:
 * - animate-pulse (skeleton loading)
 * - animate-spin (loading spinner)
 */
"use client";

import { motion } from "framer-motion";
import { Loader2, Bell } from "lucide-react";
import NotificationItem from "./notification-item";
import { AppNotification } from "@replyke/react-js";
import { cn } from "@/lib/utils";

interface NotificationListProps {
  notifications: AppNotification.PotentiallyPopulatedUnifiedAppNotification[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onNotificationClick?: (
    notification: AppNotification.PotentiallyPopulatedUnifiedAppNotification
  ) => void;
}

function NotificationSkeleton() {
  return (
    <div className="flex gap-3 p-3">
      <div className="w-8 h-8 bg-gray-50 dark:bg-gray-700 rounded-full shrink-0 animate-pulse" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-3 bg-gray-50 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
        <div className="h-2 bg-gray-50 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
        <div className="h-2 bg-gray-50 dark:bg-gray-700 rounded w-1/4 animate-pulse" />
      </div>
      <div className="w-6 h-6 bg-gray-50 dark:bg-gray-700 rounded-full shrink-0 mt-0.5 animate-pulse" />
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center p-8 text-center"
    >
      <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
        <Bell className="w-8 h-8 text-gray-600 dark:text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 m-0">
        No notifications yet
      </h3>
      <p className="text-xs text-gray-600 dark:text-gray-400 max-w-[200px] leading-relaxed m-0">
        When you get new comments, mentions, or follows, they'll appear here.
      </p>
    </motion.div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <NotificationSkeleton key={i} />
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
}: NotificationListProps) {
  // Show loading state for initial load
  if (loading && notifications.length === 0) {
    return <LoadingState />;
  }

  // Show empty state when no notifications
  if (!loading && notifications.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col h-full max-h-[400px]">
      {/* Custom scroll area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col gap-1 p-1">
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
              />
              {index < notifications.length - 1 && (
                <div className="h-px bg-gray-200 dark:border-gray-700 mx-3" />
              )}
            </motion.div>
          ))}

          {/* Load more section */}
          {(hasMore || loading) && (
            <div className="p-3">
              <div className="h-px bg-gray-200 dark:bg-gray-700 mb-3" />
              {loading ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-4 h-4 text-gray-600 dark:text-gray-400 animate-spin" />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    Loading more...
                  </span>
                </div>
              ) : (
                <button
                  onClick={onLoadMore}
                  className={cn(
                    "w-full bg-transparent border-none p-2 text-sm text-gray-600 dark:text-gray-400",
                    "cursor-pointer rounded transition-colors",
                    "hover:text-gray-900 dark:hover:text-gray-100"
                  )}
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
