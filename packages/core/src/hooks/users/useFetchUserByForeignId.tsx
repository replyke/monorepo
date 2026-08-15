import { useCallback } from "react";

import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { User, UserIncludeParam } from "../../interfaces/models/User";
import { SpaceReputationUserParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../utils/spaceReputationParams";

export interface FetchUserByForeignIdProps extends SpaceReputationUserParams {
  foreignId: string;
  include?: UserIncludeParam;
}

function useFetchUserByForeignId(): (props: FetchUserByForeignIdProps) => Promise<User> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchUserByForeignId = useCallback(
    async ({
      foreignId,
      include,
      spaceReputation,
      spaceReputationId,
      spaceReputationDescendants,
    }: FetchUserByForeignIdProps) => {
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!foreignId) {
        throw new Error("Please specify a foreign ID");
      }

      const params: Record<string, any> = {
        foreignId,
        include: Array.isArray(include) ? include.join(",") : include,
        ...buildSpaceReputationParams({
          spaceReputation,
          spaceReputationId,
          spaceReputationDescendants,
        }),
      };

      const response = await axios.get(`/${projectId}/users/by-foreign-id`, {
        params,
      });

      return response.data as User;
    },
    [axios, projectId]
  );

  return fetchUserByForeignId;
}

export default useFetchUserByForeignId;
