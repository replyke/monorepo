import { useState, useEffect, useCallback, useRef } from "react";
import { User } from "../../interfaces/models/User";
import { Mention } from "../../interfaces/models/Mention";
import useFetchUserSuggestions from "./useFetchUserSuggestions";
import { handleError } from "../../utils/handleError";

const useMentions = ({
  content,
  setContent,
  focus,
  cursorPosition,
  isSelectionActive,
}: {
  content: string;
  setContent: (value: string) => void;
  focus: () => void;
  cursorPosition: number;
  isSelectionActive: boolean;
}) => {
  const fetchMentionSuggestions = useFetchUserSuggestions();

  // const loading = useRef(false);
  const [loadingState, setLoadingState] = useState(false);

  const [mentions, setMentions] = useState<Mention[]>([]);
  const [isMentionActive, setIsMentionActive] = useState(false);
  const [mentionTrigger, setMentionTrigger] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState<User[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const debounceDelay = 1000;

  const resetMentions = () => {
    setMentions([]);
    setIsMentionActive(false);
    setMentionTrigger("");
    setMentionSuggestions([]);
    setLoadingState(false);
  };

  const addMention = (user: User) => {
    if (!user.username) throw new Error("User has no username set");
    setMentions((prevMentions) => {
      // Check if the user already exists based on id
      if (prevMentions.some((mention) => mention.id === user.id)) {
        return prevMentions; // Return the previous mentions if the user already exists
      }

      // Add the new mention if it doesn't already exist
      return [
        ...prevMentions,
        {
          id: user.id,
          username: user.username!,
        },
      ];
    });
  };

  const handleMentionClick = (user: User) => {
    const mentionRegex = new RegExp(`@${mentionTrigger}(\\s|$)`);
    setContent(content.replace(mentionRegex, `@${user.username}`));

    addMention(user);

    setIsMentionActive(false);
    setMentionTrigger("");
    setMentionSuggestions([]);
    setLoadingState(false);
    focus();
  };

  const handleFetchMentionSuggestions = useCallback(
    async (query: string) => {
      try {
        const suggestions = await fetchMentionSuggestions({ query });

        if (suggestions && suggestions.length > 0) {
          setMentionSuggestions(suggestions); // Replace with fetched data
        } else {
          setMentionSuggestions([]);
          setIsMentionActive(false);
        }
      } catch (err) {
        handleError(err, "Error fetching mentions");
      } finally {
        setLoadingState(false); // Set to false after data is fetched
      }
    },
    [fetchMentionSuggestions]
  );

  useEffect(() => {
    let start = cursorPosition - 1;

    // Move backward from cursor to find the word directly before the cursor
    while (start >= 0 && content[start] !== " ") {
      start--;
    }

    // Extract potential trigger word (start + 1 because `start` is on the space)
    const potentialTrigger = content.slice(start + 1, cursorPosition);

    // Regex to check if the trigger starts with "@" and contains only valid characters
    const validMentionPattern = /^@[\w.]+$/; // \w matches a-z, A-Z, 0-9, and "_"

    if (
      !isSelectionActive &&
      validMentionPattern.test(potentialTrigger) &&
      potentialTrigger.length > 3
    ) {
      const triggerText = potentialTrigger.slice(1); // remove "@"
      setMentionTrigger(triggerText);
      setIsMentionActive(true);
      setLoadingState(true);

      // Clear the previous debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set a new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        handleFetchMentionSuggestions(triggerText);
      }, debounceDelay);
    } else {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setMentionTrigger("");
      setIsMentionActive(false);
      setMentionSuggestions([]);
      setLoadingState(false);
    }

    // Cleanup on component unmount to clear any remaining timer
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    cursorPosition,
    isSelectionActive,
    handleFetchMentionSuggestions,
    content,
  ]);

  return {
    isMentionActive,
    loading: loadingState,
    mentionSuggestions,
    handleMentionClick,
    mentions,
    addMention,
    resetMentions,
  };
};

export default useMentions;
