import { User } from "@replyke/react-js";
import { UserAvatar, UserMentionSkeleton } from "@replyke/ui-core-react-js";
import useUIState from "../hooks/use-ui-state";

function MentionSuggestions({
  isMentionActive,
  isLoadingMentions,
  mentionSuggestions,
  handleMentionClick,
}: {
  isMentionActive: boolean;
  isLoadingMentions: boolean;
  mentionSuggestions: User[];
  handleMentionClick: (user: User) => void;
}) {
  const { theme } = useUIState();

  if (!isMentionActive) return null;
  return (
    <div
      // ref={mentionRef}
      style={{
        height: "auto",
        maxHeight: 200, // Max height + buffer
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        overflow: "hidden",
        overflowY: "auto",
        transition: "height 0.15s ease, top 0.3s ease",
        // 🎨 CUSTOMIZATION: Mention suggestions background
        backgroundColor: theme === 'dark' ? '#1F2937' : 'white',
        borderTopColor: theme === 'dark' ? '#4B5563' : '#e7e7e7',
        borderTopWidth: "1px",
        borderTopStyle: "solid",
        padding: 16,
      }}
    >
      <ul style={{ display: "grid", gap: 8 }}>
        {isLoadingMentions
          ? [1, 2, 3].map((i) => <UserMentionSkeleton key={i} />)
          : mentionSuggestions.length > 0
          ? mentionSuggestions.map((user) => (
              <li
                key={user.id}
                onClick={() => handleMentionClick(user)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <UserAvatar user={user} />
                <div
                  style={{
                    display: "grid",
                    justifyContent: "space-evenly",
                  }}
                >
                  <div style={{
                    fontSize: 14,
                    fontWeight: 500,
                    // 🎨 CUSTOMIZATION: Username text color
                    color: theme === 'dark' ? '#F9FAFB' : '#000'
                  }}>
                    {user.username}
                  </div>
                  {user.name && (
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 400,
                        // 🎨 CUSTOMIZATION: Name text color
                        color: theme === 'dark' ? '#9CA3AF' : 'gray'
                      }}
                    >
                      {user.name}
                    </div>
                  )}
                </div>
              </li>
            ))
          : null}
      </ul>
    </div>
  );
}

export default MentionSuggestions;
