import { useCommentSection } from "@replyke/react-js";
import useUIState from "../../hooks/use-ui-state";

const CommentsFooterComponent = () => {
  const { hasMore, loading } = useCommentSection();

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
        className="flex justify-center items-center h-screen"
      >
        <style>{keyframes}</style>
        <div
          className="inline-block w-10 h-10 border-4 border-gray-200/10 dark:border-gray-400/20 border-t-black dark:border-t-gray-50 rounded-full"
          style={{
            animation: "spin 1s linear infinite",
          }}
        ></div>
      </div>
    )
  );
};

export default CommentsFooterComponent;
