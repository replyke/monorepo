import { Text, View } from "react-native";

function NoCommentsPlaceHolder() {
  return (
    <View>
      <Text
        style={{
          textAlign: "center",
          fontSize: 18,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        No comments yet
      </Text>
      <Text
        style={{
          textAlign: "center",
          fontSize: 12,
          color: "#8e8e8e",
          marginTop: 0,
        }}
      >
        Start the conversation.
      </Text>
    </View>
  );
}

export default NoCommentsPlaceHolder;
