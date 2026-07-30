import { useCallback } from "react";
import useAxiosPrivate from "../../../config/useAxiosPrivate";
import useProject from "../../projects/useProject";
import { useUser } from "../../user";

export interface FetchBlockStatusProps {
  userId: string;
}

// Mirrors the server GET /users/:userId/block response verbatim. This is the
// acting user's OUTBOUND state only — do *I* block `:userId`. It never reveals
// whether `:userId` blocked me (the inbound direction is deliberately hidden).
export interface BlockStatusResponse {
  blocked: boolean;
  blockId?: string;
  createdAt?: string;
}

function useFetchBlockStatus(): (props: FetchBlockStatusProps) => Promise<BlockStatusResponse> {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();
  const { user } = useUser();

  const fetchBlockStatus = useCallback(
    async (props: FetchBlockStatusProps) => {
      const { userId } = props;
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!user) {
        throw new Error("No user is logged in");
      }

      if (!userId) {
        throw new Error("No user ID was provided");
      }

      if (userId === user.id) {
        throw new Error("Users don't block themselves");
      }

      const response = await axios.get(`/${projectId}/users/${userId}/block`);
      return response.data as BlockStatusResponse;
    },
    [axios, projectId, user?.id]
  );

  return fetchBlockStatus;
}

export default useFetchBlockStatus;
