import { User } from "@replyke/react-js";
import { UserAvatar, UserMentionSkeleton } from "@replyke/ui-core-react-js";
import useModalManager from "../hooks/use-modal-manager";

interface MentionSuggestionsProps {
  isMentionActive: boolean;
  isLoadingMentions: boolean;
  mentionSuggestions: User[];
  handleMentionClick: (user: User) => void;
}

function MentionSuggestions({
  isMentionActive,
  isLoadingMentions,
  mentionSuggestions,
  handleMentionClick,
}: MentionSuggestionsProps) {
  const { theme } = useModalManager();

  if (!isMentionActive) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "100%",
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: theme === 'dark' ? "#1F2937" : "#FFFFFF",
        borderRadius: "12px",
        border: theme === 'dark' ? "1px solid #4B5563" : "1px solid #E5E7EB",
        boxShadow:
          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        maxHeight: "200px",
        overflowY: "auto",
        marginBottom: "8px",
      }}
    >
      <div style={{ padding: "12px" }}>
        {isLoadingMentions ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[1, 2, 3].map((i) => (
              <UserMentionSkeleton key={i} />
            ))}
          </div>
        ) : mentionSuggestions.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {mentionSuggestions.map((user) => (
              <div
                key={user.id}
                onClick={() => handleMentionClick(user)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "8px",
                  borderRadius: "8px",
                  transition: "background-color 150ms ease-in-out",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? "#374151" : "#F3F4F6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <UserAvatar user={user} size={32} />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: theme === 'dark' ? "#F9FAFB" : "#111827",
                    }}
                  >
                    @{user.username}
                  </div>
                  {user.name && (
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: "400",
                        color: theme === 'dark' ? "#9CA3AF" : "#6B7280",
                      }}
                    >
                      {user.name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "16px",
              textAlign: "center" as const,
              color: theme === 'dark' ? "#9CA3AF" : "#6B7280",
              fontSize: "14px",
            }}
          >
            No users found
          </div>
        )}
      </div>
    </div>
  );
}

export default MentionSuggestions;