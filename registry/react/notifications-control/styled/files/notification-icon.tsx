import {
  MessageCircle,
  Heart,
  AtSign,
  UserPlus,
  MessageSquare,
  LucideIcon,
  Wrench,
} from "lucide-react";
import { AppNotification } from "@replyke/react-js";

interface NotificationIconProps {
  type: AppNotification.UnifiedAppNotification["type"];
  style?: React.CSSProperties;
  isDarkTheme: boolean;
}

// Theme-aware icon configuration
const getIconConfig = (isDark = false) => {
  const baseConfig: Record<
    AppNotification.UnifiedAppNotification["type"],
    {
      Icon: LucideIcon;
      color: { light: string; dark: string };
      backgroundColor: { light: string; dark: string };
    }
  > = {
    system: {
      Icon: Wrench,
      color: { light: "#2563eb", dark: "#3b82f6" },
      backgroundColor: { light: "#dbeafe", dark: "rgba(59, 130, 246, 0.15)" },
    },
    "entity-comment": {
      Icon: MessageCircle,
      color: { light: "#2563eb", dark: "#3b82f6" },
      backgroundColor: { light: "#dbeafe", dark: "rgba(59, 130, 246, 0.15)" },
    },
    "comment-reply": {
      Icon: MessageSquare,
      color: { light: "#2563eb", dark: "#3b82f6" },
      backgroundColor: { light: "#dbeafe", dark: "rgba(59, 130, 246, 0.15)" },
    },
    "entity-mention": {
      Icon: AtSign,
      color: { light: "#9333ea", dark: "#a855f7" },
      backgroundColor: { light: "#ede9fe", dark: "rgba(168, 85, 247, 0.15)" },
    },
    "comment-mention": {
      Icon: AtSign,
      color: { light: "#9333ea", dark: "#a855f7" },
      backgroundColor: { light: "#ede9fe", dark: "rgba(168, 85, 247, 0.15)" },
    },
    "entity-upvote": {
      Icon: Heart,
      color: { light: "#dc2626", dark: "#ef4444" },
      backgroundColor: { light: "#fee2e2", dark: "rgba(239, 68, 68, 0.15)" },
    },
    "comment-upvote": {
      Icon: Heart,
      color: { light: "#dc2626", dark: "#ef4444" },
      backgroundColor: { light: "#fee2e2", dark: "rgba(239, 68, 68, 0.15)" },
    },
    "new-follow": {
      Icon: UserPlus,
      color: { light: "#16a34a", dark: "#22c55e" },
      backgroundColor: { light: "#dcfce7", dark: "rgba(34, 197, 94, 0.15)" },
    },
    "connection-accepted": {
      Icon: UserPlus,
      color: { light: "#16a34a", dark: "#22c55e" },
      backgroundColor: { light: "#dcfce7", dark: "rgba(34, 197, 94, 0.15)" },
    },
    "connection-request": {
      Icon: UserPlus,
      color: { light: "#16a34a", dark: "#22c55e" },
      backgroundColor: { light: "#dcfce7", dark: "rgba(34, 197, 94, 0.15)" },
    },
  };

  // Convert to theme-specific format
  return Object.entries(baseConfig).reduce(
    (acc, [key, value]) => {
      acc[key as AppNotification.UnifiedAppNotification["type"]] = {
        Icon: value.Icon,
        color: isDark ? value.color.dark : value.color.light,
        backgroundColor: isDark
          ? value.backgroundColor.dark
          : value.backgroundColor.light,
      };
      return acc;
    },
    {} as Record<
      AppNotification.UnifiedAppNotification["type"],
      {
        Icon: LucideIcon;
        color: string;
        backgroundColor: string;
      }
    >
  );
};

function NotificationIcon({
  type,
  style = {},
  isDarkTheme,
}: NotificationIconProps) {
  const iconConfig = getIconConfig(isDarkTheme);
  const config = iconConfig[type];
  const { Icon, color, backgroundColor } = config;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        padding: "8px",
        flexShrink: 0,
        backgroundColor,
        ...style,
      }}
    >
      <Icon style={{ width: "16px", height: "16px", color }} />
    </div>
  );
}

export default NotificationIcon;
