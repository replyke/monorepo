import { resetButton, resetUl } from "@sublay/ui-core-react-js";
import useUIState from "../../../hooks/use-ui-state";

function MainContent({ clickReport }: { clickReport: () => void }) {
  const {
    closeCommentMenuModal,
    theme
  } = useUIState();

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
            // 🎨 CUSTOMIZATION: Report button color (red for danger)
            color: theme === 'dark' ? '#F87171' : '#DC2626',
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
      <div style={{
        height: 1,
        width: "100%",
        // 🎨 CUSTOMIZATION: Divider color
        backgroundColor: theme === 'dark' ? '#4B5563' : '#e7e7e7'
      }} />
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
            // 🎨 CUSTOMIZATION: Cancel button color
            color: theme === 'dark' ? '#F9FAFB' : '#000',
            paddingLeft: 24,
            paddingRight: 24,
            paddingTop: 8,
            paddingBottom: 8,
          }}
          onClick={closeCommentMenuModal}
        >
          Cancel
        </button>
      </li>
    </ul>
  );
}

export default MainContent;
