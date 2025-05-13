import React from "react";
import {
  SocialStyleCallbacks,
  SocialStyleConfig,
  useSocialStyle,
} from "@replyke/comments-social-core";
import { useEntity } from "@replyke/core";
import useSocialComments from "../hooks/useSocialComments";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

function SocialCommentSection({
  callbacks,
  styleConfig: styleConfigProp,
  isVisible = true,
  sortOptions = ["top", "new", "old"],
  header,
}: {
  callbacks?: SocialStyleCallbacks;
  styleConfig?: SocialStyleConfig;
  isVisible?: boolean;
  sortOptions?: Array<"top" | "new" | "old"> | null;
  header?: React.ReactNode;
}) {
  const { entity } = useEntity();

  const styleConfig = useSocialStyle(styleConfigProp);

  const { CommentSectionProvider, SortByButton, CommentsFeed, NewCommentForm } =
    useSocialComments({
      entityId: entity?.id,
      styleConfig,
      callbacks,
    });

  const buttonStyles = {
    active: {
      backgroundColor: "black",
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    inactive: {
      backgroundColor: "#e5e7eb",
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    textActive: {
      color: "white",
      fontSize: 12,
    },
    textInactive: {
      color: "black",
      fontSize: 12,
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
    <CommentSectionProvider>
      {(header || sortOptions) && (
        <View
          style={{
            flexDirection: "row",
            paddingLeft: 24,
            paddingRight: 24,
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1 }}>{header}</View>
          {sortOptions !== null && renderSortButtons()}
        </View>
      )}

      <ScrollView style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <CommentsFeed />
      </ScrollView>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
        }}
      >
        {isVisible && <NewCommentForm />}
      </View>
    </CommentSectionProvider>
  );
}

export default SocialCommentSection;
