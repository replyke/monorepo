import { useCommentSection } from "@replyke/react-js";
import useUIState from "../../hooks/use-ui-state";

const CommentsFooterComponent = () => {
  const { hasMore, loading } = useCommentSection();
  const { theme } = useUIState();

  // Inline style for keyframes (added directly to a <style> tag for this minimal setup)
  const keyframes = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  return (
    hasMore &&
    loading && (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <style>{keyframes}</style>
        <div
          style={{
            display: "inline-block",
            width: "40px",
            height: "40px",
            // 🎨 CUSTOMIZATION: Spinner colors
            border: theme === 'dark' ? '4px solid rgba(156, 163, 175, 0.2)' : '4px solid rgba(0, 0, 0, 0.1)',
            borderTop: theme === 'dark' ? '4px solid #F9FAFB' : '4px solid #000',
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        ></div>
      </div>
    )
  );
};

export default CommentsFooterComponent;
