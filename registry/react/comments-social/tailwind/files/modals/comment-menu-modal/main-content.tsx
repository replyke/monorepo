import { resetButton, resetUl } from "@replyke/ui-core-react-js";
import useUIState from "../../../hooks/use-ui-state";

function MainContent({ clickReport }: { clickReport: () => void }) {
  const {
    closeCommentMenuModal
  } = useUIState();

  return (
    <ul
      style={resetUl}
      className="w-full"
    >
      <li className="flex justify-center justify-self-center">
        <button
          style={resetButton}
          className="font-semibold text-red-600 dark:text-red-400 px-6 py-2"
          onClick={clickReport}
        >
          Report
        </button>
      </li>
      <div className="h-px w-full bg-gray-200 dark:bg-gray-600" />
      <li className="flex justify-center justify-self-center">
        <button
          style={resetButton}
          className="text-gray-900 dark:text-gray-50 px-6 py-2"
          onClick={closeCommentMenuModal}
        >
          Cancel
        </button>
      </li>
    </ul>
  );
}

export default MainContent;
