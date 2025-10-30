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
  const { theme } = useUIState();

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
      style={{
        ...resetButton,
        // 🎨 CUSTOMIZATION: Show/hide button styling (Default: 8px top padding)
        paddingTop: 8,
        paddingLeft: 56,
        paddingRight: 16,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      {/* Button line */}
      <div
        style={{
          height: 1,
          width: 24,
          marginTop: "2px",
          // 🎨 CUSTOMIZATION: Line and text color
          backgroundColor: theme === 'dark' ? '#9CA3AF' : '#737373',
        }}
      />
      {/* Button text */}
      <span style={{
        fontSize: 12,
        color: theme === 'dark' ? '#9CA3AF' : '#737373',
        fontWeight: 600
      }}>
        {text}
      </span>
    </button>
  );
};

export default ShowHideButton;
