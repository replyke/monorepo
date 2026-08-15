import { useCallback } from "react";

import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { User, UserIncludeParam } from "../../interfaces/models/User";
import { SpaceReputationUserParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../utils/spaceReputationParams";

export interface FetchUserProps extends SpaceReputationUserParams {
  userId: string;
  include?: UserIncludeParam;
}

function useFetchUser(): (props: FetchUserProps) => Promise<User> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchUser = useCallback(
    async ({
      userId,
      include,
      spaceReputation,
      spaceReputationId,
      spaceReputationDescendants,
    }: FetchUserProps) => {
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!userId) {
        throw new Error("Please specify a user ID");
      }

      const params: Record<string, any> = {
        include: Array.isArray(include) ? include.join(",") : include,
        ...buildSpaceReputationParams({
          spaceReputation,
          spaceReputationId,
          spaceReputationDescendants,
        }),
      };

      const response = await axios.get(`/${projectId}/users/${userId}`, {
        params,
      });

      return response.data as User;
    },
    [axios, projectId]
  );

  return fetchUser;
}

export default useFetchUser;
