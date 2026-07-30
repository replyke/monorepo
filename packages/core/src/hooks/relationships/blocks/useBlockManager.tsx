import { useState, useEffect, useCallback, useRef } from "react";
import useBlockUser from "./useBlockUser";
import useUnblockUser from "./useUnblockUser";
import useFetchBlockStatus from "./useFetchBlockStatus";
import useUser from "../../user/useUser";

export interface UseBlockManagerProps {
  userId: string;
}

export interface UseBlockManagerValues {
  isBlocked: boolean | null;
  isLoading: boolean;
  toggleBlock: () => Promise<void>;
}

function useBlockManager({ userId }: UseBlockManagerProps): UseBlockManagerValues {
  const { user } = useUser();

  const [isBlocked, setIsBlocked] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const fetchBlockStatus = useFetchBlockStatus();

  // Keep a ref so the effect always calls the latest version without being in deps
  const fetchBlockStatusRef = useRef(fetchBlockStatus);
  fetchBlockStatusRef.current = fetchBlockStatus;

  useEffect(() => {
    const loadBlockStatus = async () => {
      try {
        setIsLoading(true);
        const result = await fetchBlockStatusRef.current({ userId });
        setIsBlocked(result.blocked);
      } catch (error) {
        console.error("Failed to fetch block status:", error);
        setIsBlocked(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId && user?.id && user.id !== userId) {
      loadBlockStatus();
    }
  }, [userId, user?.id]);

  const toggleBlock = useCallback(async () => {
    if (isBlocked === null || isLoading || user?.id === userId) return;

    try {
      if (isBlocked) {
        await unblockUser({ userId });
        setIsBlocked(false);
      } else {
        await blockUser({ userId });
        setIsBlocked(true);
      }
    } catch (error) {
      console.error("Failed to toggle block status:", error);
    }
  }, [isBlocked, isLoading, userId, blockUser, unblockUser]);

  return {
    isBlocked,
    isLoading,
    toggleBlock,
  };
}

export default useBlockManager;
