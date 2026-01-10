import moment from "moment";

function formatTime(time: Date | string, justNowText: string): string {
  const now = new Date();
  const then = new Date(time);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 20) {
    return justNowText;
  } else if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  } else if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h`;
  } else if (seconds < 2592000) {
    // 30 days
    return `${Math.floor(seconds / 86400)}d`;
  } else if (seconds < 31536000) {
    // 365 days
    return `${Math.floor(seconds / 2592000)}mo`;
  } else {
    return `${Math.floor(seconds / 31536000)}y`;
  }
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
      <span
        style={{
          fontSize,
          fontWeight,
          color,
        }}
      >
        {formatTime(time, justNowText)}
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize,
        fontWeight,
        color,
      }}
    >
      {moment(new Date(time)).fromNow()}
    </span>
  );
}

export default FromNow;
