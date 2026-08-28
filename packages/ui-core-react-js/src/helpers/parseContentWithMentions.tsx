/**
 * Characters that, when they immediately precede an `@handle`, mean the match
 * is part of a larger token rather than a real mention — e.g. the `@alice` in
 * `email@alice.com`. Kept as an explicit class instead of `\b`/lookbehind
 * because this file is mirrored into the React Native package, where Hermes'
 * regex support for those constructs is not dependable across versions.
 */
const NON_BOUNDARY_CHAR = /[A-Za-z0-9_.@]/;

export const parseContentWithMentions = (
  content: string,
  mentions: { id: string; foreignId?: string; username: string }[],
  loggedInUserId: string | undefined,
  currentUserClickCallback: (() => void) | undefined,
  otherUserClickCallback:
    | ((userId: string, userForeignId: string | null | undefined) => void)
    | undefined
): (string | React.JSX.Element)[] => {
  if (!mentions.length) return [content];

  // Longest username first. A regex alternation takes the first branch that
  // matches at a position, so with `@al|@alice` the content `@alice` would
  // match `@al` purely because of the caller's array order.
  const sortedMentions = [...mentions].sort(
    (a, b) => b.username.length - a.username.length
  );

  // Create a regex pattern to match all mentions in the array, escaping special characters
  const mentionPattern = new RegExp(
    sortedMentions
      .map(
        (mention) =>
          `@${mention.username.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}`
      )
      .join("|"),
    "g"
  );

  // Walk the matches in order, slicing the plain text between them. (Pairing a
  // `split()` with a separate `matchAll()` cannot survive a match being
  // rejected below, because only one of the two would drop it.)
  const parsedContent: (string | React.JSX.Element)[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(mentionPattern)) {
    const start = match.index ?? 0;

    const precedingChar = start > 0 ? content[start - 1] : "";
    if (precedingChar && NON_BOUNDARY_CHAR.test(precedingChar)) {
      // Inside a larger token — leave it in the surrounding plain text.
      continue;
    }

    const matchedMention = sortedMentions.find(
      (mention) => `@${mention.username}` === match[0]
    );
    if (!matchedMention) continue;

    if (start > lastIndex) {
      parsedContent.push(content.slice(lastIndex, start));
    }

    parsedContent.push(
      <span
        style={{ color: "#1e40af", cursor: "pointer" }}
        onClick={() => {
          if (matchedMention.id === loggedInUserId) {
            currentUserClickCallback?.();
          } else {
            otherUserClickCallback?.(matchedMention.id, matchedMention.foreignId);
          }
        }}
        key={start}
      >
        {match[0]}
      </span>
    );

    lastIndex = start + match[0].length;
  }

  if (lastIndex < content.length) {
    parsedContent.push(content.slice(lastIndex));
  }

  return parsedContent;
};
