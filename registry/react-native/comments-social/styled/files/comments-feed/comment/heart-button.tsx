import { TouchableOpacity, StyleSheet, Vibration } from "react-native";
import {
  HeartIcon,
  HeartFullIcon,
  resetButton,
} from "@replyke/ui-core-react-native";

const HeartButton = ({
  userUpvoted,
  handleUpvote,
  handleRemoveUpvote,
  iconSize,
  fullColor,
  emptyColor,
  padding = 0,
  paddingBottom = 0,
}: {
  userUpvoted: boolean;
  handleUpvote: () => void;
  handleRemoveUpvote: () => void;
  iconSize?: number;
  fullColor?: string;
  emptyColor?: string;
  padding?: number;
  paddingBottom?: number;
}) => {
  return userUpvoted ? (
    <TouchableOpacity
      onPress={handleRemoveUpvote}
      style={[styles.button, { padding, paddingBottom }]}
    >
      <HeartFullIcon size={iconSize} color={fullColor} />
    </TouchableOpacity>
  ) : (
    <TouchableOpacity
      onPress={() => {
        handleUpvote();
        Vibration.vibrate(100);
      }}
      style={[styles.button, { padding, paddingBottom }]}
    >
      <HeartIcon size={iconSize} color={emptyColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...resetButton,
  },
});

export default HeartButton;
