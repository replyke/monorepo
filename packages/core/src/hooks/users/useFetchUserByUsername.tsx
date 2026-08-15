import { useCallback } from "react";

import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { User, UserIncludeParam } from "../../interfaces/models/User";
import { SpaceReputationUserParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../utils/spaceReputationParams";

export interface FetchUserByUsernameProps extends SpaceReputationUserParams {
  username: string;
  include?: UserIncludeParam;
}

function useFetchUserByUsername(): (props: FetchUserByUsernameProps) => Promise<User> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchUserByUsername = useCallback(
    async ({
      username,
      include,
      spaceReputation,
      spaceReputationId,
      spaceReputationDescendants,
    }: FetchUserByUsernameProps) => {
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!username) {
        throw new Error("Please specify a username");
      }

      const params: Record<string, any> = {
        username,
        include: Array.isArray(include) ? include.join(",") : include,
        ...buildSpaceReputationParams({
          spaceReputation,
          spaceReputationId,
          spaceReputationDescendants,
        }),
      };

      const response = await axios.get(`/${projectId}/users/by-username`, {
        params,
      });

      return response.data as User;
    },
    [axios, projectId]
  );

  return fetchUserByUsername;
}

export default useFetchUserByUsername;
