import { useState } from "react";

// const commonEmojis10 = [
//   "😂",
//   "❤️",
//   "🤣",
//   "😍",
//   "🙏",
//   "🥰",
//   "😊",
//   "😭",
//   "👍",
//   "😅",
// ];
const commonEmojis15 = [
  "😂",
  "❤️",
  "🤣",
  "😍",
  "🙏",
  "🥰",
  "😊",
  "😭",
  "👍",
  "😅",
  "😢",
  "👏",
  "💕",
  "🥺",
  "😘",
];
// const commonEmojis20 = [
//   "😂",
//   "❤️",
//   "🤣",
//   "😍",
//   "🙏",
//   "🥰",
//   "😊",
//   "😭",
//   "👍",
//   "😅",
//   "😢",
//   "👏",
//   "💕",
//   "🥺",
//   "😘",
//   "🤔",
//   "🤗",
//   "🙌",
//   "😎",
//   "✨",
// ];
function EmojiSuggestions({
  onEmojiClick,
}: {
  onEmojiClick: (emoji: string) => void;
}) {
  const [clickedEmoji, setClickedEmoji] = useState<string | null>(null);

  const handleEmojiClick = (emoji: string) => {
    setClickedEmoji(emoji);
    onEmojiClick(emoji);
    setTimeout(() => setClickedEmoji(null), 150); // Reset after animation
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: 8,
        borderBottom: "1px solid #e6e6e6",
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {commonEmojis15.map((emoji) => (
        <div
          key={emoji}
          onClick={() => handleEmojiClick(emoji)}
          style={{
            cursor: "pointer",
            fontSize: 16,
            display: "inline-block",
            userSelect: "none",
            transition: "transform 0.15s",
            transform: clickedEmoji === emoji ? "scale(0.8)" : "scale(1)", // Shrink and grow
          }}
        >
          {emoji}
        </div>
      ))}
    </div>
  );
}

export default EmojiSuggestions;
