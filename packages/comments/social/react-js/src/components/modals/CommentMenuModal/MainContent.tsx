import { resetButton, resetUl } from "@replyke/ui-core-react-js";
import useModalManager from "../../../hooks/useModalManager";

function MainContent({ clickReport }: { clickReport: () => void }) {
  const { closeCommentOptionsModal } = useModalManager();
  return (
    <ul
      style={{
        ...resetUl,
        width: "100%",
      }}
    >
      <li
        style={{
          display: "flex",
          justifyContent: "center",
          justifySelf: "center",
        }}
      >
        <button
          style={{
            ...resetButton,
            fontWeight: 600,
            color: "#DC2626",
            paddingLeft: 24,
            paddingRight: 24,
            paddingTop: 8,
            paddingBottom: 8,
          }}
          onClick={clickReport}
        >
          Report
        </button>
      </li>
      <div style={{ height: 1, width: "100%", backgroundColor: "#e7e7e7" }} />
      <li
        style={{
          display: "flex",
          justifyContent: "center",
          justifySelf: "center",
        }}
      >
        <button
          style={{
            ...resetButton,
            paddingLeft: 24,
            paddingRight: 24,
            paddingTop: 8,
            paddingBottom: 8,
          }}
          onClick={closeCommentOptionsModal}
        >
          Cancel
        </button>
      </li>
    </ul>
  );
}

export default MainContent;
