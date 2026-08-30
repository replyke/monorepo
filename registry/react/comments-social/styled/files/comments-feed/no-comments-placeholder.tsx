import useUIState from "../../hooks/use-ui-state";

function NoCommentsPlaceHolder() {
  const { theme } = useUIState();

  return (
    <div
      style={{
        padding: 16,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <p
        style={{
          textAlign: "center",
          fontSize: 18,
          fontWeight: 700,
          marginBottom: 8,
          // 🎨 CUSTOMIZATION: Title text color
          color: theme === 'dark' ? '#F9FAFB' : '#000',
        }}
      >
        No comments yet
      </p>
      <p
        style={{
          textAlign: "center",
          fontSize: 12,
          // 🎨 CUSTOMIZATION: Subtitle text color
          color: theme === 'dark' ? '#9CA3AF' : '#8e8e8e',
          marginTop: 0,
        }}
      >
        Start the conversation.
      </p>
    </div>
  );
}

export default NoCommentsPlaceHolder;
