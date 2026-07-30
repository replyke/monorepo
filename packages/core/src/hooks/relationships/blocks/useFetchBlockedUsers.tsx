import { useCallback } from "react";
import useAxiosPrivate from "../../../config/useAxiosPrivate";
import useProject from "../../projects/useProject";
import { useUser } from "../../user";
import { User } from "../../../interfaces/models/User";
import { PaginatedResponse } from "../../../interfaces/PaginatedResponse";

export interface FetchBlockedUsersParams {
  page?: number;
  limit?: number;
}

// One row of the acting user's own block list (GET /blocks). Field names mirror
// the server response verbatim.
export interface BlockedUser {
  id: string;
  blockedUser: User | null;
  createdAt: string;
}

function useFetchBlockedUsers(): (props?: FetchBlockedUsersParams) => Promise<PaginatedResponse<BlockedUser>> {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();
  const { user } = useUser();

  const fetchBlockedUsers = useCallback(
    async (
      props: FetchBlockedUsersParams = {}
    ): Promise<PaginatedResponse<BlockedUser>> => {
      const { page = 1, limit = 20 } = props;
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!user) {
        throw new Error("No user is logged in");
      }

      const response = await axios.get<PaginatedResponse<BlockedUser>>(
        `/${projectId}/blocks`,
        {
          params: {
            page,
            limit,
          },
        }
      );

      return response.data;
    },
    [axios, projectId, user]
  );

  return fetchBlockedUsers;
}

export default useFetchBlockedUsers;
