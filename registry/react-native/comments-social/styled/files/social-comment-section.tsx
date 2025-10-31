/**
 * Replyke Social Comment Section (React Native)
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
 *
 * @see https://docs.replyke.com/components/comments-social
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
 * - #e5e7eb → #4B5563 (sort buttons inactive)
 * - #000000 → #1F2937 (sort buttons active background)
 *
 * TEXT:
 * - #000 → #F9FAFB (primary text - author names, comment body)
 * - #737373 → #9CA3AF (secondary text - timestamps, reply button)
 * - #8E8E8E → #9CA3AF (tertiary text - likes count)
 * - #FFFFFF → #F9FAFB (sort button active text)
 *
 * BORDERS:
 * - #e5e7eb → #4B5563 (borders, dividers)
 *
 * BLUES (post button, links):
 * - #0A99F6 → #60A5FA (primary blue - post button)
 * - #3B82F6 → #60A5FA (hover states)
 *
 * REDS (heart icon, destructive actions):
 * - #DC2626 → #F87171 (filled heart, danger)
 * - #8E8E8E → #9CA3AF (empty heart)
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

  // 🔧 CUSTOMIZE: Sort options for comments
  // Remove or reorder these options as needed
  const sortOptions: Array<"top" | "new" | "old"> = ["top", "new", "old"];

  const { SortByButton, CommentsFeed, NewCommentForm } = useSocialComments({
    entity: undefined,
    entityId: undefined,
    foreignId: undefined,
    shortId: undefined,
  });

  const buttonStyles = {
    active: {
      // 🎨 CUSTOMIZATION: Sort button active styles
      backgroundColor: theme === 'dark' ? '#1F2937' : 'black',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    textActive: {
      color: theme === 'dark' ? '#F9FAFB' : 'white',
      fontSize: 12,
    },
    inactive: {
      // 🎨 CUSTOMIZATION: Sort button inactive styles
      backgroundColor: theme === 'dark' ? '#4B5563' : '#e5e7eb',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    textInactive: {
      color: theme === 'dark' ? '#F9FAFB' : 'black',
      fontSize: 12,
    },
  };

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
      const marginStyle = isFirst ? {} : { marginLeft: 4 };

      return (
        <SortByButton
          key={priority}
          priority={priority}
          activeView={
            <TouchableOpacity style={[buttonStyles.active, marginStyle]}>
              <Text style={buttonStyles.textActive}>{label}</Text>
            </TouchableOpacity>
          }
          nonActiveView={
            <TouchableOpacity style={[buttonStyles.inactive, marginStyle]}>
              <Text style={buttonStyles.textInactive}>{label}</Text>
            </TouchableOpacity>
          }
        />
      );
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {sortOptions.length > 0 && (
        <View
          style={{
            flexDirection: "row",
            // 🎨 CUSTOMIZATION: Header padding (Default: 24px horizontal, 12px vertical)
            paddingLeft: 24,
            paddingRight: 24,
            paddingTop: 12,
            paddingBottom: 12,
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          {renderSortButtons()}
        </View>
      )}

      <ScrollView
        style={{
          flex: 1,
          // 🎨 CUSTOMIZATION: Feed background
          backgroundColor: theme === 'dark' ? "#1F2937" : "#ffffff",
        }}
      >
        <CommentsFeed>{children}</CommentsFeed>
      </ScrollView>

      <View
        style={{
          // 🎨 CUSTOMIZATION: Form border color
          borderTopWidth: 1,
          borderTopColor: theme === 'dark' ? "#4B5563" : "#e5e7eb",
        }}
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
