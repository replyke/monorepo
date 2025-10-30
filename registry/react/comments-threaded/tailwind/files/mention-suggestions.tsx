import { User, useCommentSection } from "@replyke/react-js";
import { UserAvatar, UserMentionSkeleton } from "@replyke/ui-core-react-js";

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
  const { callbacks } = useCommentSection();

  if (!isMentionActive) return null;

  return (
    <div
      className="absolute bottom-full left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 shadow-lg max-h-[200px] overflow-y-auto mb-2"
    >
      <div className="p-3">
        {isLoadingMentions ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <UserMentionSkeleton key={i} />
            ))}
          </div>
        ) : mentionSuggestions.length > 0 ? (
          <div className="flex flex-col gap-1">
            {mentionSuggestions.map((user) => (
              <div
                key={user.id}
                onClick={() => {
                  if (!user.username) {
                    callbacks?.userCantBeMentionedCallback?.();
                    return;
                  }
                  handleMentionClick(user);
                }}
                className="cursor-pointer flex items-center gap-3 p-2 rounded-lg transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <UserAvatar user={user} size={32} />
                <div className="flex flex-col gap-0.5">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    @{user.username}
                  </div>
                  {user.name && (
                    <div className="text-xs font-normal text-gray-500 dark:text-gray-400">
                      {user.name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            No users found
          </div>
        )}
      </div>
    </div>
  );
}

export default MentionSuggestions;