/**
 * Replyke Threaded Comment Section (React Native - Tailwind)
 *
 * A complete threaded comment system with upvotes/downvotes, nested replies, and moderation.
 *
 * Installation: npx @replyke/cli add comments-threaded
 *
 * Required dependencies:
 * - @replyke/core ^6.0.0
 * - @replyke/ui-core-react-native ^6.0.0
 * - @gorhom/bottom-sheet
 * - nativewind ^4.0.0
 *
 * @see https://docs.replyke.com/components/comments-threaded
 *
 * ====================
 * THEME COLOR PALETTE
 * ====================
 *
 * This component supports light and dark themes via the `theme` prop.
 * Tailwind dark mode classes are used for conditional styling.
 *
 * BACKGROUNDS:
 * - bg-white / dark:bg-gray-800 (main background)
 * - bg-gray-50 / dark:bg-gray-700 (secondary background, vote buttons)
 * - bg-blue-100 / dark:bg-blue-900 (highlighted comment background)
 *
 * TEXT:
 * - text-gray-900 / dark:text-gray-50 (primary text)
 * - text-gray-800 / dark:text-gray-200 (body text)
 * - text-gray-700 / dark:text-gray-300 (author names, secondary text)
 * - text-gray-500 / dark:text-gray-400 (timestamps, tertiary text)
 *
 * BORDERS:
 * - border-gray-200 / dark:border-gray-600 (primary borders)
 * - border-gray-300 / dark:border-gray-500 (threading lines)
 *
 * BLUES (links, actions, upvotes):
 * - text-blue-600 / dark:text-blue-400 (primary blue)
 * - bg-blue-500 / dark:bg-blue-400 (active upvote)
 *
 * REDS (downvotes, destructive actions):
 * - text-red-600 / dark:text-red-400 (primary red)
 * - bg-red-500 / dark:bg-red-400 (active downvote)
 */
import React from "react";
import { View, ScrollView } from "react-native";
import { Entity } from "@replyke/core";
import useThreadedComments from "../hooks/use-threaded-comments";
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

  const { CommentsFeed, NewCommentForm } = useThreadedComments({
    entity: undefined,
    entityId: undefined,
    foreignId: undefined,
    shortId: undefined,
  });

  return (
    <View className="flex-1">
      <ScrollView
        className={`flex-1 py-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
        keyboardShouldPersistTaps="handled"
      >
        <CommentsFeed>{children}</CommentsFeed>
      </ScrollView>

      <View
        className={`border-t pt-2 ${
          theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
        }`}
      >
        {isVisible && <NewCommentForm />}
      </View>
    </View>
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
    theme,
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
