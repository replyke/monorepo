import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { User } from "@replyke/core";
import { UserAvatar, UserMentionSkeleton } from "@replyke/ui-core-react-native";
import useUIState from "../../hooks/use-ui-state";

interface MentionSuggestionsProps {
  isMentionActive: boolean;
  isLoadingMentions: boolean;
  mentionSuggestions: User[];
  handleMentionClick: (user: User) => void;
}

const MentionSuggestions: React.FC<MentionSuggestionsProps> = ({
  isMentionActive,
  isLoadingMentions,
  mentionSuggestions,
  handleMentionClick,
}) => {
  const { theme } = useUIState();

  if (!isMentionActive) return null;

  return (
    <View
      style={{
        height: "auto",
        maxHeight: 200,
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        overflow: "hidden",
        // 🎨 CUSTOMIZATION: Mention suggestions background
        backgroundColor: theme === 'dark' ? "#1F2937" : "white",
        borderTopColor: theme === 'dark' ? "#4B5563" : "#e7e7e7",
        borderTopWidth: 1,
        padding: 16,
      }}
    >
      {isLoadingMentions ? (
        <FlatList
          data={[1, 2, 3]} // Just a placeholder array for loading skeletons
          keyExtractor={(item) => `loading-${item}`}
          renderItem={() => <UserMentionSkeleton />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          keyboardShouldPersistTaps="always"
        />
      ) : (
        <FlatList
          data={mentionSuggestions}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="always"
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleMentionClick(item)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 8,
              }}
            >
              <UserAvatar user={item} />
              <View style={{ justifyContent: "space-evenly", marginLeft: 8 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: "500",
                  // 🎨 CUSTOMIZATION: Username color
                  color: theme === 'dark' ? "#F9FAFB" : "#000",
                }}>
                  {item.username}
                </Text>
                {item.name && (
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "400",
                      // 🎨 CUSTOMIZATION: Name color
                      color: theme === 'dark' ? "#9CA3AF" : "gray",
                    }}
                  >
                    {item.name}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

export default MentionSuggestions;
