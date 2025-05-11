import { Mention } from "@replyke/core";

export const parseContentWithMentions = (
  content: string,
  mentions: Mention[],
  currentUserId: string | undefined,
  currentUserClickCallback: (() => void) | undefined,
  otherUserClickCallback: ((userId: string) => void) | undefined
): (string | React.JSX.Element)[] => {
  if (!mentions.length) return [content];

  // Create a regex pattern to match all mentions in the array, escaping special characters
  const mentionPattern = new RegExp(
    mentions
      .map(
        (mention) =>
          `@${mention.username.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}`
      )
      .join("|"),
    "g"
  );

  // Replace mentions with a placeholder and split content based on the regex
  const parts = content.split(mentionPattern);

  // Find all matched mentions in the content
  const matches = Array.from(content.matchAll(mentionPattern));

  // Construct the parsed output
  const parsedContent: (string | React.JSX.Element)[] = [];
  let lastIndex = 0;

  parts.forEach((part, index) => {
    if (part) {
      parsedContent.push(part);
      lastIndex += part.length;
    }

    const match = matches[index];
    if (match) {
      const matchedMention = mentions.find(
        (mention) => `@${mention.username}` === match[0]
      );
      if (matchedMention) {
        parsedContent.push(
          <span
            style={{ color: "#1e40af" }}
            onClick={() => {
              if (matchedMention.id === currentUserId) {
                currentUserClickCallback?.();
              } else {
                otherUserClickCallback?.(matchedMention.id);
              }
            }}
            key={lastIndex}
          >
            {match[0]}
          </span>
        );
        lastIndex += match[0].length;
      }
    }
  });

  return parsedContent;
};
