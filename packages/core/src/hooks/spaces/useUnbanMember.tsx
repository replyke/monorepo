import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import type { UnbanMemberResponse } from "../../interfaces/models/Space";

export interface UnbanMemberProps {
  spaceId: string;
  memberId: string;
}

function useUnbanMember(): (props: UnbanMemberProps) => Promise<UnbanMemberResponse> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const unbanMember = useCallback(
    async ({ spaceId, memberId }: UnbanMemberProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      if (!spaceId || !memberId) {
        throw new Error("spaceId and memberId are required");
      }

      const response = await axios.patch(
        `/${projectId}/spaces/${spaceId}/members/${memberId}/unban`
      );

      return response.data as UnbanMemberResponse;
    },
    [projectId]
  );

  return unbanMember;
}

export default useUnbanMember;
