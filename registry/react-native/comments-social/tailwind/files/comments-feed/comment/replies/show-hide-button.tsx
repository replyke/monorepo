import { TouchableOpacity, View, Text } from "react-native";
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

  // CUSTOMIZATION: Show/hide button styling defaults
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
      className="bg-transparent border-0 p-0 m-0 pt-2 pl-[58px] pr-4 flex-row items-center gap-3"
    >
      <View
        className={`h-px w-6 mt-0.5 ${
          theme === 'dark' ? 'bg-gray-400' : 'bg-neutral-500'
        }`}
      />
      <Text
        className={`text-xs font-semibold ${
          theme === 'dark' ? 'text-gray-400' : 'text-neutral-500'
        }`}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
};

export default ShowHideButton;
