/**
 * NotificationIcon - Tailwind Variant
 *
 * Type-based notification icon with theme-aware colors.
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
 * COLORS USED:
 * - Blue (comments): bg-blue-100 dark:bg-blue-500/15, text-blue-600 dark:text-blue-400
 * - Purple (mentions): bg-purple-100 dark:bg-purple-500/15, text-purple-600 dark:text-purple-400
 * - Red (upvotes): bg-red-100 dark:bg-red-500/15, text-red-600 dark:text-red-400
 * - Green (follows): bg-green-100 dark:bg-green-500/15, text-green-600 dark:text-green-400
 */
import {
  MessageCircle,
  Heart,
  AtSign,
  UserPlus,
  MessageSquare,
  LucideIcon,
  Wrench,
  Smile,
  Sparkles,
  Frown,
  Angry,
  Laugh,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { AppNotification } from "@replyke/react-js";
import { cn } from "@/lib/utils";

interface NotificationIconProps {
  type: AppNotification.UnifiedAppNotification["type"];
  reactionType?: string;
  className?: string;
}

// Get icon for specific reaction types
const getReactionIcon = (reactionType?: string): LucideIcon => {
  switch (reactionType) {
    case "love": return Heart;
    case "wow": return Sparkles;
    case "sad": return Frown;
    case "angry": return Angry;
    case "funny": return Laugh;
    case "upvote": return ThumbsUp;
    case "downvote": return ThumbsDown;
    case "like":
    default: return Smile;
  }
};

// Icon configuration with Tailwind classes
const getIconConfig = (): Record<
  AppNotification.UnifiedAppNotification["type"],
  {
    Icon: LucideIcon;
    colorClass: string;
    bgClass: string;
  }
> => ({
  system: {
    Icon: Wrench,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-100 dark:bg-blue-500/15",
  },
  "entity-comment": {
    Icon: MessageCircle,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-100 dark:bg-blue-500/15",
  },
  "comment-reply": {
    Icon: MessageSquare,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-100 dark:bg-blue-500/15",
  },
  "entity-mention": {
    Icon: AtSign,
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-100 dark:bg-purple-500/15",
  },
  "comment-mention": {
    Icon: AtSign,
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-100 dark:bg-purple-500/15",
  },
  "entity-upvote": {
    Icon: Heart,
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-100 dark:bg-red-500/15",
  },
  "comment-upvote": {
    Icon: Heart,
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-100 dark:bg-red-500/15",
  },
  "entity-reaction": {
    Icon: Smile,
    colorClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-100 dark:bg-orange-500/15",
  },
  "comment-reaction": {
    Icon: Smile,
    colorClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-100 dark:bg-orange-500/15",
  },
  "new-follow": {
    Icon: UserPlus,
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-100 dark:bg-green-500/15",
  },
  "connection-accepted": {
    Icon: UserPlus,
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-100 dark:bg-green-500/15",
  },
  "connection-request": {
    Icon: UserPlus,
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-100 dark:bg-green-500/15",
  },
});

function NotificationIcon({ type, reactionType, className }: NotificationIconProps) {
  const iconConfig = getIconConfig();
  const config = iconConfig[type];
  const { colorClass, bgClass } = config;

  // For reaction types, use reaction-specific icon
  const Icon = (type === "entity-reaction" || type === "comment-reaction")
    ? getReactionIcon(reactionType)
    : config.Icon;

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full p-2 shrink-0",
        bgClass,
        className
      )}
    >
      <Icon className={cn("w-4 h-4", colorClass)} />
    </div>
  );
}

export default NotificationIcon;
