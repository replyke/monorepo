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
  if (!isMentionActive) return null;
  return (
    <div
      style={{
        maxHeight: 200,
      }}
      className="h-auto absolute bottom-0 left-0 right-0 z-10 overflow-hidden overflow-y-auto transition-all duration-150 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 p-4"
    >
      <ul className="grid gap-2">
        {isLoadingMentions
          ? [1, 2, 3].map((i) => <UserMentionSkeleton key={i} />)
          : mentionSuggestions.length > 0
          ? mentionSuggestions.map((user) => (
              <li
                key={user.id}
                onClick={() => handleMentionClick(user)}
                className="cursor-pointer flex items-center gap-2"
              >
                <UserAvatar user={user} />
                <div
                  className="grid justify-evenly"
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-50">
                    {user.username}
                  </div>
                  {user.name && (
                    <div
                      className="text-sm font-normal text-gray-500 dark:text-gray-400"
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
