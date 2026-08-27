import useUIState from "../../../../hooks/use-ui-state";

function ToggleRepliesVisibilty({
  isCollapsed,
  onToggleCollapse,
}: {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { theme } = useUIState();

  return (
    <button
      onClick={onToggleCollapse}
      style={{
        marginLeft: "4px",
        width: "16px",
        height: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: theme === 'dark' ? "#9CA3AF" : "#6B7280",
        backgroundColor: theme === 'dark' ? "#374151" : "#F3F4F6",
        borderRadius: "2px",
        transition: "all 150ms ease-in-out",
        fontSize: "14px",
        fontWeight: "bold",
        border: isCollapsed ? (theme === 'dark' ? "1px solid #6B7280" : "1px solid #D1D5DB") : "none",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = theme === 'dark' ? "#D1D5DB" : "#374151";
        e.currentTarget.style.backgroundColor = theme === 'dark' ? "#4B5563" : "#E5E7EB";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = theme === 'dark' ? "#9CA3AF" : "#6B7280";
        e.currentTarget.style.backgroundColor = theme === 'dark' ? "#374151" : "#F3F4F6";
      }}
      title={isCollapsed ? "Expand thread" : "Collapse thread"}
    >
      {isCollapsed ? "+" : "−"}
    </button>
  );
}

export default ToggleRepliesVisibilty;
