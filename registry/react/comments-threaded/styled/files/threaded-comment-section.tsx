/**
 * Replyke Threaded Comment Section
 *
 * A complete threaded comment system with upvotes/downvotes, nested replies, and moderation.
 *
 * Installation: npx @replyke/cli add comments-threaded
 *
 * Required dependencies:
 * - @replyke/react-js ^6.0.0
 * - @replyke/ui-core-react-js ^6.0.0
 *
 * @see https://docs.replyke.com/components/comments-threaded
 */
import React from "react";
import { Entity } from "@replyke/react-js";
import useThreadedComments from "../hooks/use-threaded-comments";
import CommentsFeed from "./comments-feed/comments-feed";
import NewCommentForm from "./new-comment-form";
import { deepEqual, warnPropChanges } from "../utils/prop-comparison";

// Simplified callbacks interface (removed from -core package)
export interface ThreadedStyleCallbacks {
  loginRequiredCallback?: () => void;
  onCommentClick?: (commentId: string) => void;
  onUserClick?: (userId: string) => void;
}

interface ThreadedCommentSectionProps {
  entity?: Entity | undefined | null;
  entityId?: string | undefined | null;
  foreignId?: string | undefined | null;
  shortId?: string | undefined | null;
  callbacks?: ThreadedStyleCallbacks;
  isVisible?: boolean;
  highlightedCommentId?: string | undefined | null;
  children?: React.ReactNode;
}

// Custom comparison function to prevent unnecessary re-renders
const arePropsEqual = (
  prevProps: ThreadedCommentSectionProps,
  nextProps: ThreadedCommentSectionProps
): boolean => {
  // Add development warnings for unnecessary prop changes
  warnPropChanges("ThreadedCommentSection", prevProps, nextProps, [
    "entity",
    "callbacks",
  ]);

  // Compare primitive values
  if (
    prevProps.entityId !== nextProps.entityId ||
    prevProps.foreignId !== nextProps.foreignId ||
    prevProps.shortId !== nextProps.shortId ||
    prevProps.isVisible !== nextProps.isVisible
  ) {
    return false;
  }

  // Deep compare entity objects for more accurate comparison
  if (!deepEqual(prevProps.entity, nextProps.entity)) {
    return false;
  }

  // Deep compare callbacks to handle cases where
  // parent component creates new objects with same content
  if (!deepEqual(prevProps.callbacks, nextProps.callbacks)) {
    return false;
  }

  return true;
};

function ThreadedCommentSectionInner({
  isVisible,
  children,
}: {
  isVisible: boolean;
  children?: React.ReactNode;
}) {
  // 🎨 CUSTOMIZATION: Layout styling
  const backgroundColor = "#fff"; // Default: white
  const verticalPadding = 8; // Default: 8px

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          backgroundColor: backgroundColor,
          paddingTop: `${verticalPadding}px`,
          paddingBottom: `${verticalPadding}px`,
        }}
      >
        <CommentsFeed>{children}</CommentsFeed>
      </div>

      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          paddingTop: `${verticalPadding}px`,
        }}
      >
        {isVisible && <NewCommentForm />}
      </div>
    </div>
  );
}

function ThreadedCommentSection({
  entity,
  entityId,
  foreignId,
  shortId,
  callbacks,
  isVisible = true,
  highlightedCommentId,
  children,
}: ThreadedCommentSectionProps) {
  const { CommentSectionProvider } = useThreadedComments({
    entity,
    entityId,
    foreignId,
    shortId,
    callbacks,
    highlightedCommentId,
  });

  return (
    <CommentSectionProvider>
      <ThreadedCommentSectionInner isVisible={isVisible}>
        {children}
      </ThreadedCommentSectionInner>
    </CommentSectionProvider>
  );
}

export default React.memo(ThreadedCommentSection, arePropsEqual);
