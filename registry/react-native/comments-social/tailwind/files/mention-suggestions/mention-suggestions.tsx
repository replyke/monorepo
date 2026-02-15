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
      className={`h-auto max-h-[200px] absolute bottom-0 left-0 right-0 z-10 overflow-hidden p-4 border-t ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-600'
          : 'bg-white border-gray-200'
      }`}
    >
      {isLoadingMentions ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={(item) => `loading-${item}`}
          renderItem={() => <UserMentionSkeleton />}
          ItemSeparatorComponent={() => <View className="h-2.5" />}
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
              className="flex-row items-center py-2"
            >
              <UserAvatar user={item} />
              <View className="justify-evenly ml-2">
                <Text
                  className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-50' : 'text-black'
                  }`}
                >
                  {item.username}
                </Text>
                {item.name && (
                  <Text
                    className={`text-sm font-normal ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}
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
