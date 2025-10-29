import useModalManager from "../../hooks/use-modal-manager";

function NoCommentsPlaceHolder() {
  const { theme } = useModalManager();

  return (
    <div>
      <p
        style={{
          textAlign: "center",
          fontSize: 18,
          fontWeight: 700,
          color: theme === 'dark' ? "#E5E7EB" : "#1F2937", // 🎨 CUSTOMIZATION: No comments title color
          marginBottom: 8,
        }}
      >
        No comments yet
      </p>
      <p
        style={{
          textAlign: "center",
          fontSize: 12,
          color: theme === 'dark' ? "#9CA3AF" : "#8e8e8e",
          marginTop: 0,
        }}
      >
        Start the conversation.
      </p>
    </div>
  );
}

export default NoCommentsPlaceHolder;
