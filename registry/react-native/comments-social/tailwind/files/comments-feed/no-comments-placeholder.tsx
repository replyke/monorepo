import { Text, View } from "react-native";
import useUIState from "../../hooks/use-ui-state";

function NoCommentsPlaceHolder() {
  const { theme } = useUIState();

  return (
    <View>
      <Text
        className={`text-center text-lg font-bold mb-2 ${
          theme === 'dark' ? 'text-gray-50' : 'text-black'
        }`}
      >
        No comments yet
      </Text>
      <Text
        className={`text-center text-xs mt-0 ${
          theme === 'dark' ? 'text-gray-400' : 'text-neutral-500'
        }`}
      >
        Start the conversation.
      </Text>
    </View>
  );
}

export default NoCommentsPlaceHolder;
