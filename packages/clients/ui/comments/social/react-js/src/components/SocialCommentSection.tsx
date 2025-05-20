import React from "react";
import {
  SocialStyleCallbacks,
  useSocialStyle,
  PartialSocialStyleConfig,
} from "@replyke/comments-social-core";
import { Entity, useEntity } from "@replyke/react-js";
import useSocialComments from "../hooks/useSocialComments";

function SocialCommentSection({
  entity,
  entityId,
  foreignId,
  shortId,
  callbacks,
  styleConfig: styleConfigProp,
  isVisible = true,
  sortOptions = ["top", "new", "old"],
  header,
  withEmojis,
}: {
  entity?: Entity;
  entityId?: string | undefined | null;
  foreignId?: string | undefined | null;
  shortId?: string | undefined | null;
  callbacks?: SocialStyleCallbacks;
  styleConfig?: Partial<PartialSocialStyleConfig>;
  isVisible?: boolean;
  sortOptions?: Array<"top" | "new" | "old"> | null;
  header?: React.ReactNode;
  withEmojis?: boolean;
}) {
  const styleConfig = useSocialStyle(styleConfigProp);

  const { CommentSectionProvider, SortByButton, CommentsFeed, NewCommentForm } =
    useSocialComments({
      entity,
      entityId,
      foreignId,
      shortId,
      styleConfig,
      callbacks,
    });

  const buttonStyles = {
    active: {
      backgroundColor: "black",
      padding: "4px 8px",
      borderRadius: "6px",
      color: "white",
      fontSize: "12px",
    },
    inactive: {
      backgroundColor: "#e5e7eb",
      padding: "4px 8px",
      borderRadius: "6px",
      fontSize: "12px",
    },
  };

  const renderSortButtons = () => {
    if (!sortOptions) return null;

    const optionsMap: Record<
      "top" | "new" | "old",
      { label: string; priority: "top" | "new" | "old" }
    > = {
      top: { label: "Top", priority: "top" },
      new: { label: "New", priority: "new" },
      old: { label: "Old", priority: "old" },
    };

    return sortOptions.map((option) => {
      const { label, priority } = optionsMap[option];
      return (
        <SortByButton
          key={priority}
          priority={priority}
          activeView={<div style={buttonStyles.active}>{label}</div>}
          nonActiveView={<div style={buttonStyles.inactive}>{label}</div>}
        />
      );
    });
  };

  return (
    <CommentSectionProvider>
      {(header || sortOptions) && (
        <div
          style={{
            display: "flex",
            paddingLeft: "24px",
            paddingRight: "24px",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <div style={{ flex: 1 }}>{header}</div>
          {sortOptions !== null && renderSortButtons()}
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          backgroundColor: "white",
        }}
      >
        <CommentsFeed />
      </div>

      <div style={{ borderTop: "1px solid #e5e7eb" }}>
        {isVisible && <NewCommentForm withEmojis={withEmojis} />}
      </div>
    </CommentSectionProvider>
  );
}

export default SocialCommentSection;
