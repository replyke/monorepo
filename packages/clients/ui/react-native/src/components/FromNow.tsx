import moment from "moment";
import { Text } from "react-native";
import { FontWeight } from "@replyke/ui-core";

function formatTime(time: Date | string, justNowText: string): string {
  const now = new Date();
  const then = new Date(time);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  let timeString = "";

  if (seconds < 20) {
    timeString = justNowText;
  } else if (seconds < 60) {
    timeString = `${seconds}s`;
  } else if (seconds < 3600) {
    timeString = `${Math.floor(seconds / 60)}m`;
  } else if (seconds < 86400) {
    timeString = `${Math.floor(seconds / 3600)}h`;
  } else if (seconds < 2592000) {
    // 30 days
    timeString = `${Math.floor(seconds / 86400)}d`;
  } else if (seconds < 31536000) {
    // 365 days
    timeString = `${Math.floor(seconds / 2592000)}mo`;
  } else {
    timeString = `${Math.floor(seconds / 31536000)}y`;
  }

  return timeString;
}

function FromNow({
  time,
  fontSize = 12,
  fontWeight = 400,
  color = "#737373",
  lean,
  justNowText = "Just now",
}: {
  time: Date | string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  lean?: boolean;
  justNowText?: string;
}) {
  if (lean) {
    return (
      <Text
        style={{
          fontSize,
          fontWeight: fontWeight as FontWeight,
          color,
        }}
      >
        {formatTime(time, justNowText)}
      </Text>
    );
  }
  return (
    <Text
      style={{
        fontSize,
        fontWeight: fontWeight as FontWeight,
        color,
      }}
    >
      {moment(new Date(time)).fromNow()}
    </Text>
  );
}

export default FromNow;
