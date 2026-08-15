import { useCallback } from "react";
import { Reaction, ReactionType } from "../../interfaces/models/Reaction";
import { PaginatedResponse } from "../../interfaces/PaginatedResponse";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../utils/spaceReputationParams";

export interface FetchEntityReactionsProps extends SpaceReputationContextParams {
  entityId: string;
  page: number;
  limit?: number;
  reactionType?: ReactionType;
  sortDir?: "asc" | "desc";
}

function useFetchEntityReactions(): (props: FetchEntityReactionsProps) => Promise<PaginatedResponse<Reaction>> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchEntityReactions = useCallback(
    async (props: FetchEntityReactionsProps): Promise<PaginatedResponse<Reaction>> => {
      const { entityId, page, limit = 20, reactionType, sortDir = "desc", spaceReputation, spaceReputationId, spaceReputationDescendants } = props;

      if (page === 0) {
        throw new Error("Can't fetch reactions with page 0");
      }

      if (limit === 0) {
        throw new Error("Can't fetch with limit 0");
      }

      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!entityId) {
        throw new Error("No entity ID provided");
      }

      const params: Record<string, any> = {
        page,
        limit,
        sortDir,
        ...buildSpaceReputationParams({
          spaceReputation,
          spaceReputationId,
          spaceReputationDescendants,
        }),
      };

      if (reactionType) {
        params.reactionType = reactionType;
      }

      const response = await axios.get<PaginatedResponse<Reaction>>(
        `/${projectId}/entities/${entityId}/reactions`,
        { params }
      );

      return response.data;
    },
    [axios, projectId]
  );

  return fetchEntityReactions;
}

export default useFetchEntityReactions;
