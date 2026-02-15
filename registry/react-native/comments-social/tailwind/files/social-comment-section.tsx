/**
 * Replyke Social Comment Section (React Native - Tailwind)
 *
 * A complete social-style comment system with likes, replies, and moderation.
 * Instagram-inspired design with hearts, avatars, and nested replies.
 *
 * Installation: npx @replyke/cli add comments-social
 *
 * Required dependencies:
 * - @replyke/core ^6.0.0
 * - @replyke/ui-core-react-native ^6.0.0
 * - @gorhom/bottom-sheet
 * - nativewind ^4.0.0
 *
 * @see https://docs.replyke.com/components/comments-social
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
 * - bg-gray-100 / dark:bg-gray-700 (secondary background, hover states)
 * - bg-gray-200 / dark:bg-gray-600 (sort buttons inactive)
 * - bg-black / dark:bg-gray-800 (sort buttons active background)
 *
 * TEXT:
 * - text-black / dark:text-gray-50 (primary text - author names, comment body)
 * - text-neutral-500 / dark:text-gray-400 (secondary text - timestamps, reply button)
 * - text-white / dark:text-gray-50 (sort button active text)
 *
 * BORDERS:
 * - border-gray-200 / dark:border-gray-600 (borders, dividers)
 *
 * BLUES (post button, links):
 * - text-sky-500 / dark:text-blue-400 (primary blue - post button)
 *
 * REDS (heart icon, destructive actions):
 * - text-red-600 / dark:text-red-400 (filled heart, danger)
 */
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Entity } from "@replyke/core";
import useSocialComments from "../hooks/use-social-comments";
import { deepEqual, warnPropChanges } from "../utils/prop-comparison";
import useUIState from "../hooks/use-ui-state";

interface SocialCommentSectionProps {
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
  prevProps: SocialCommentSectionProps,
  nextProps: SocialCommentSectionProps
): boolean => {
  // Add development warnings for unnecessary prop changes
  warnPropChanges("SocialCommentSection", prevProps, nextProps, [
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

function SocialCommentSectionInner({
  isVisible,
  children,
}: {
  isVisible: boolean;
  children?: React.ReactNode;
}) {
  const { theme } = useUIState();

  // CUSTOMIZE: Sort options for comments
  // Remove or reorder these options as needed
  const sortOptions: Array<"top" | "new" | "old"> = ["top", "new", "old"];

  const { SortByButton, CommentsFeed, NewCommentForm } = useSocialComments({
    entity: undefined,
    entityId: undefined,
    foreignId: undefined,
    shortId: undefined,
  });

  const renderSortButtons = () => {
    const optionsMap: Record<
      "top" | "new" | "old",
      { label: string; priority: "top" | "new" | "old" }
    > = {
      top: { label: "Top", priority: "top" },
      new: { label: "New", priority: "new" },
      old: { label: "Old", priority: "old" },
    };

    return sortOptions.map((option, index) => {
      const { label, priority } = optionsMap[option];
      const isFirst = index === 0;

      return (
        <SortByButton
          key={priority}
          priority={priority}
          activeView={
            <TouchableOpacity
              className={`py-1 px-2 rounded-md ${isFirst ? '' : 'ml-1'} ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-black'
              }`}
            >
              <Text className={`text-xs ${
                theme === 'dark' ? 'text-gray-50' : 'text-white'
              }`}>
                {label}
              </Text>
            </TouchableOpacity>
          }
          nonActiveView={
            <TouchableOpacity
              className={`py-1 px-2 rounded-md ${isFirst ? '' : 'ml-1'} ${
                theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
              }`}
            >
              <Text className={`text-xs ${
                theme === 'dark' ? 'text-gray-50' : 'text-black'
              }`}>
                {label}
              </Text>
            </TouchableOpacity>
          }
        />
      );
    });
  };

  return (
    <View className="flex-1">
      {sortOptions.length > 0 && (
        <View className="flex-row px-6 py-3 items-center justify-end">
          {renderSortButtons()}
        </View>
      )}

      <ScrollView
        className={`flex-1 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
      >
        <CommentsFeed>{children}</CommentsFeed>
      </ScrollView>

      <View
        className={`border-t ${
          theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
        }`}
      >
        {isVisible && <NewCommentForm />}
      </View>
    </View>
  );
}

function SocialCommentSection({
  entity,
  entityId,
  foreignId,
  shortId,
  isVisible = true,
  highlightedCommentId,
  theme = 'light',
  children,
}: SocialCommentSectionProps) {
  const { CommentSectionProvider } = useSocialComments({
    entity,
    entityId,
    foreignId,
    shortId,
    theme,
    highlightedCommentId,
  });

  return (
    <CommentSectionProvider>
      <SocialCommentSectionInner isVisible={isVisible}>
        {children}
      </SocialCommentSectionInner>
    </CommentSectionProvider>
  );
}

export default React.memo(SocialCommentSection, arePropsEqual);
