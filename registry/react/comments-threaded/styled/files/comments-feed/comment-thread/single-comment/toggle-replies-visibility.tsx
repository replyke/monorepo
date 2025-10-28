function ToggleRepliesVisibilty({
  isCollapsed,
  onToggleCollapse,
}: {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
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
        color: "#6B7280",
        backgroundColor: "#F3F4F6",
        borderRadius: "2px",
        transition: "all 150ms ease-in-out",
        fontSize: "14px",
        fontWeight: "bold",
        border: isCollapsed ? "1px solid #D1D5DB" : "none",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#374151";
        e.currentTarget.style.backgroundColor = "#E5E7EB";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "#6B7280";
        e.currentTarget.style.backgroundColor = "#F3F4F6";
      }}
      title={isCollapsed ? "Expand thread" : "Collapse thread"}
    >
      {isCollapsed ? "+" : "−"}
    </button>
  );
}

export default ToggleRepliesVisibilty;
