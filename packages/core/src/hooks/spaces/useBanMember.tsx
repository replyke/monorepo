import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import type { BanMemberResponse } from "../../interfaces/models/Space";

export interface BanMemberProps {
  spaceId: string;
  memberId: string;
}

function useBanMember(): (props: BanMemberProps) => Promise<BanMemberResponse> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const banMember = useCallback(
    async ({ spaceId, memberId }: BanMemberProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      if (!spaceId || !memberId) {
        throw new Error("spaceId and memberId are required");
      }

      const response = await axios.patch(
        `/${projectId}/spaces/${spaceId}/members/${memberId}/ban`
      );

      return response.data as BanMemberResponse;
    },
    [projectId]
  );

  return banMember;
}

export default useBanMember;
