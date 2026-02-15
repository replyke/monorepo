import { TouchableOpacity, Vibration } from "react-native";
import {
  HeartIcon,
  HeartFullIcon,
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
      className="flex items-center justify-center bg-transparent border-0 m-0"
      style={{ padding, paddingBottom }}
    >
      <HeartFullIcon size={iconSize} color={fullColor} />
    </TouchableOpacity>
  ) : (
    <TouchableOpacity
      onPress={() => {
        handleUpvote();
        Vibration.vibrate(100);
      }}
      className="flex items-center justify-center bg-transparent border-0 m-0"
      style={{ padding, paddingBottom }}
    >
      <HeartIcon size={iconSize} color={emptyColor} />
    </TouchableOpacity>
  );
};

export default HeartButton;
