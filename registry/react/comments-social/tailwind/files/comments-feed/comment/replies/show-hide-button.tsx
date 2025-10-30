import { resetButton } from "@replyke/ui-core-react-js";
import useUIState from "../../../../hooks/use-ui-state";

const ShowHideButton = ({
  //   text,
  totalRepliesCount,
  loadedRepliesCount,
  page,
  setPage,
  areRepliesVisible,
  setAreRepliesVisible,
}: {
  //   text: string;
  totalRepliesCount: number;
  loadedRepliesCount: number;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  areRepliesVisible: boolean;
  setAreRepliesVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

  let action: ("show" | "hide" | "load-more")[] = [];
  let text = "";

  switch (true) {
    // This case is if the replies were never expanded before (page === 0)
    case !areRepliesVisible && page === 0:
      action = ["show", "load-more"];
      // 🎨 CUSTOMIZATION: Text label for "View more replies ($count)"
      text = "View more replies ($count)".replace(
        "$count",
        totalRepliesCount.toString()
      );
      break;

    // This case is if the replies have been shown previously but are now hidden (user had o oad all before hidding)
    case !areRepliesVisible && page > 0:
      action = ["show"];
      text = "View more replies ($count)".replace(
        "$count",
        totalRepliesCount.toString()
      );
      break;

    // This case is if the replies are visible and there are more replies to load
    case areRepliesVisible && totalRepliesCount > loadedRepliesCount:
      action = ["load-more"];
      text = "View more replies ($count)".replace(
        "$count",
        (totalRepliesCount - loadedRepliesCount).toString()
      );
      break;

    // This case is if the replies are visible and all of them have been loaded
    case areRepliesVisible && totalRepliesCount <= loadedRepliesCount:
      action = ["hide"];
      // 🎨 CUSTOMIZATION: Text label for "Hide replies"
      text = "Hide replies";
      break;
  }

  if (totalRepliesCount === 0) return null;

  return (
    <button
      onClick={() => {
        if (action.includes("show")) setAreRepliesVisible(true);
        if (action.includes("hide")) setAreRepliesVisible(false);
        if (action.includes("load-more")) setPage((p) => p + 1);
      }}
      style={resetButton}
      className="pt-2 pl-14 pr-4 flex items-center gap-3"
    >
      {/* Button line */}
      <div
        className="h-px w-6 mt-0.5 bg-gray-600 dark:bg-gray-400"
      />
      {/* Button text */}
      <span className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
        {text}
      </span>
    </button>
  );
};

export default ShowHideButton;
