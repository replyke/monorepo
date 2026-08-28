import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import { parseContentWithMentions } from "./parseContentWithMentions";

type Mention = { id: string; foreignId?: string; username: string };

const alice: Mention = { id: "user-alice", username: "alice" };
const al: Mention = { id: "user-al", username: "al" };

type Part = string | { text: unknown; userId: string | undefined };

/**
 * Run the parser and flatten its output into something comparable. Linked
 * parts are reduced to the text shown *and the user the link actually fires
 * for* — the latter is the whole point: a mention can render plausible text
 * while pointing at the wrong person.
 */
function parse(content: string, mentions: Mention[]): Part[] {
  let clickedUserId: string | undefined;

  const parsed = parseContentWithMentions(
    content,
    mentions,
    undefined,
    undefined,
    (userId) => {
      clickedUserId = userId;
    }
  );

  return parsed.map((part) => {
    if (typeof part === "string") return part;
    const element = part as ReactElement<{
      children: unknown;
      onClick: () => void;
    }>;
    clickedUserId = undefined;
    element.props.onClick();
    return { text: element.props.children, userId: clickedUserId };
  });
}

describe("parseContentWithMentions", () => {
  const linkedAlice = { text: "@alice", userId: "user-alice" };

  it("links the longer username even when a shorter prefix is listed first", () => {
    expect(parse("hey @alice check this out", [al, alice])).toEqual([
      "hey ",
      linkedAlice,
      " check this out",
    ]);
  });

  it("produces the same result regardless of the mentions array order", () => {
    expect(parse("hey @alice check this out", [alice, al])).toEqual([
      "hey ",
      linkedAlice,
      " check this out",
    ]);
  });

  it("does not match a handle inside an email address", () => {
    expect(parse("contact me at email@alice.com please", [alice])).toEqual([
      "contact me at email@alice.com please",
    ]);
  });

  it("links a single unambiguous mention", () => {
    expect(parse("hi @alice!", [alice])).toEqual(["hi ", linkedAlice, "!"]);
  });

  it("returns the content untouched when it contains no mention", () => {
    expect(parse("just some text", [alice])).toEqual(["just some text"]);
  });
});
