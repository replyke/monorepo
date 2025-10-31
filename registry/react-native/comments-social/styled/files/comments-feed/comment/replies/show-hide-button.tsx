import { TouchableOpacity, View, Text } from "react-native";
import { resetButton } from "@replyke/ui-core-react-native";
import useUIState from "../../../../hooks/use-ui-state";

const ShowHideButton = ({
  totalRepliesCount,
  loadedRepliesCount,
  page,
  setPage,
  areRepliesVisible,
  setAreRepliesVisible,
}: {
  totalRepliesCount: number;
  loadedRepliesCount: number;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  areRepliesVisible: boolean;
  setAreRepliesVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { theme } = useUIState();

  // 🎨 CUSTOMIZATION: Show/hide button styling defaults
  const viewRepliesPaddingTop = 8;
  const viewMoreRepliesText = "View $count more replies";
  const hideRepliesText = "Hide replies";

  let action: ("show" | "hide" | "load-more")[] = [];
  let text = "";

  switch (true) {
    // This case is if the replies were never expanded before (page === 0)
    case !areRepliesVisible && page === 0:
      action = ["show", "load-more"];
      text = viewMoreRepliesText.replace(
        "$count",
        totalRepliesCount.toString()
      );
      break;

    // This case is if the replies have been shown previously but are now hidden (user had to load all before hiding)
    case !areRepliesVisible && page > 0:
      action = ["show"];
      text = viewMoreRepliesText.replace(
        "$count",
        totalRepliesCount.toString()
      );
      break;

    // This case is if the replies are visible and there are more replies to load
    case areRepliesVisible && totalRepliesCount > loadedRepliesCount:
      action = ["load-more"];
      text = viewMoreRepliesText.replace(
        "$count",
        (totalRepliesCount - loadedRepliesCount).toString()
      );
      break;

    // This case is if the replies are visible and all of them have been loaded
    case areRepliesVisible && totalRepliesCount <= loadedRepliesCount:
      action = ["hide"];
      text = hideRepliesText;
      break;
  }

  if (totalRepliesCount === 0) return null;

  return (
    <TouchableOpacity
      onPress={() => {
        if (action.includes("show")) setAreRepliesVisible(true);
        if (action.includes("hide")) setAreRepliesVisible(false);
        if (action.includes("load-more")) setPage((p) => p + 1);
      }}
      style={{
        ...resetButton,
        paddingTop: viewRepliesPaddingTop,
        paddingLeft: 58,
        paddingRight: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View
        style={{
          height: 1,
          width: 24,
          marginTop: 2,
          // 🎨 CUSTOMIZATION: Line color
          backgroundColor: theme === 'dark' ? '#9CA3AF' : '#737373',
        }}
      />
      <Text style={{
        fontSize: 12,
        fontWeight: '600',
        // 🎨 CUSTOMIZATION: Text color
        color: theme === 'dark' ? '#9CA3AF' : '#737373',
      }}>
        {text}
      </Text>
    </TouchableOpacity>
  );
};

export default ShowHideButton;
