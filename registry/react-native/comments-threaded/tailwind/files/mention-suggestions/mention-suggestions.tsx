import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { User, useCommentSection } from "@replyke/core";
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
  const { callbacks } = useCommentSection();

  if (!isMentionActive) return null;

  return (
    <View
      className={`h-auto max-h-[200px] absolute bottom-0 left-0 right-0 z-10 overflow-hidden p-3 rounded-xl border mb-2 mx-2 ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-600'
          : 'bg-white border-gray-200'
      }`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      {isLoadingMentions ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={(item) => `loading-${item}`}
          renderItem={() => <UserMentionSkeleton />}
          ItemSeparatorComponent={() => <View className="h-2" />}
          keyboardShouldPersistTaps="always"
        />
      ) : mentionSuggestions.length > 0 ? (
        <FlatList
          data={mentionSuggestions}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="always"
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                if (!item.username) {
                  callbacks?.userCantBeMentionedCallback?.();
                  return;
                }
                handleMentionClick(item);
              }}
              className={`flex-row items-center gap-3 p-2 rounded-lg ${
                theme === 'dark' ? 'active:bg-gray-700' : 'active:bg-gray-50'
              }`}
            >
              <UserAvatar user={item} size={32} />
              <View className="flex-col gap-0.5">
                <Text
                  className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-50' : 'text-gray-900'
                  }`}
                >
                  @{item.username}
                </Text>
                {item.name && (
                  <Text
                    className={`text-xs font-normal ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    {item.name}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View className="h-1" />}
        />
      ) : (
        <View className="py-4 items-center justify-center">
          <Text
            className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            No users found
          </Text>
        </View>
      )}
    </View>
  );
};

export default MentionSuggestions;
