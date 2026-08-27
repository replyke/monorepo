/**
 * Sublay Threaded Comment Section
 *
 * A complete threaded comment system with upvotes/downvotes, nested replies, and moderation.
 *
 * Installation: npx @sublay/cli add comments-threaded
 *
 * Required dependencies:
 * - @sublay/react-js ^6.0.0
 * - @sublay/ui-core-react-js ^6.0.0
 *
 * @see https://docs.sublay.com/components/comments-threaded
 *
 * ====================
 * THEME COLOR PALETTE
 * ====================
 *
 * This component supports light and dark themes via the `theme` prop.
 * Use theme === 'dark' ? DARK_COLOR : LIGHT_COLOR for conditional styling.
 *
 * BACKGROUNDS:
 * - #FFFFFF → #1F2937 (main background)
 * - #F3F4F6 → #374151 (secondary background, hover states)
 * - #EFF6FF → #1E3A8A (blue hover backgrounds)
 * - #FEF2F2 → #7F1D1D (red hover backgrounds)
 * - #dbeafe → #1E40AF (highlighted comment background)
 *
 * TEXT:
 * - #111827 → #F9FAFB (primary text)
 * - #1F2937 → #E5E7EB (body text)
 * - #374151 → #D1D5DB (author names, secondary text)
 * - #4B5563 → #9CA3AF (hover text)
 * - #6B7280 → #9CA3AF (timestamps, tertiary text)
 * - #8e8e8e → #9CA3AF (placeholder text)
 * - #9CA3AF → #6B7280 (disabled states)
 * - #000000 → #FFFFFF (report modal elements)
 *
 * BORDERS:
 * - #E5E7EB → #4B5563 (primary borders)
 * - #D1D5DB → #6B7280 (threading lines, secondary borders)
 * - #e7e7e7 → #4B5563 (dividers)
 *
 * BLUES (links, actions, upvotes):
 * - #3B82F6 → #60A5FA (primary blue)
 * - #2563EB → #3B82F6 (buttons)
 * - #1D4ED8 → #2563EB (button hover)
 * - #BFDBFE → #1E40AF (active borders)
 *
 * REDS (downvotes, destructive actions):
 * - #EF4444 → #F87171 (primary red)
 * - #DC2626 → #EF4444 (destructive buttons)
 */
import React from "react";
import { Entity } from "@sublay/react-js";
import useThreadedComments from "../hooks/use-threaded-comments";
import CommentsFeed from "./comments-feed/comments-feed";
import NewCommentForm from "./new-comment-form";
import { deepEqual, warnPropChanges } from "../utils/prop-comparison";
import useUIState from "../hooks/use-ui-state";

interface ThreadedCommentSectionProps {
  entity?: Entity | undefined | null;
  entityId?: string | undefined | null;
  foreignId?: string | undefined | null;
  shortId?: string | undefined | null;
  isVisible?: boolean;
  highlightedCommentId?: string | undefined | null;
  theme?: 'light' | 'dark';
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
  ]);

  // Compare primitive values
  if (
    prevProps.entityId !== nextProps.entityId ||
    prevProps.foreignId !== nextProps.foreignId ||
    prevProps.shortId !== nextProps.shortId ||
    prevProps.isVisible !== nextProps.isVisible ||
    prevProps.highlightedCommentId !== nextProps.highlightedCommentId ||
    prevProps.theme !== nextProps.theme
  ) {
    return false;
  }

  // Deep compare entity objects for more accurate comparison
  if (!deepEqual(prevProps.entity, nextProps.entity)) {
    return false;
  }

  // Compare children (reference comparison for React nodes)
  if (prevProps.children !== nextProps.children) {
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
  const { theme } = useUIState();

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          // 🎨 CUSTOMIZATION: Layout styling (Default: white)
          backgroundColor: theme === 'dark' ? "#1F2937" : "#fff",
          // 🎨 CUSTOMIZATION: Layout styling (Default: 8px)
          paddingTop: "8px",
          paddingBottom: "8px",
        }}
      >
        <CommentsFeed>{children}</CommentsFeed>
      </div>

      <div
        style={{
          borderTop: theme === 'dark' ? "1px solid #4B5563" : "1px solid #e5e7eb",
          // 🎨 CUSTOMIZATION: Layout styling (Default: 8px)
          paddingTop: "8px",
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
  isVisible = true,
  highlightedCommentId,
  theme = 'light',
  children,
}: ThreadedCommentSectionProps) {
  const { CommentSectionProvider } = useThreadedComments({
    entity,
    entityId,
    foreignId,
    shortId,
    highlightedCommentId,
    theme,
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
