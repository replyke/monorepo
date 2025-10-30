import {
  HeartFullIcon,
  HeartIcon,
  resetButton,
} from "@replyke/ui-core-react-js";

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
    <div
      onClick={handleRemoveUpvote}
      style={{
        padding,
        paddingBottom,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...resetButton,
      }}
    >
      <HeartFullIcon size={iconSize} color={fullColor} />
    </div>
  ) : (
    <div
      onClick={handleUpvote}
      style={{
        padding,
        paddingBottom,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...resetButton,
      }}
    >
      <HeartIcon size={iconSize} color={emptyColor} />
    </div>
  );
};

export default HeartButton;
