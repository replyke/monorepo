import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { HandleReportResponse } from "./useHandleSpaceCommentReport";

export interface HandleSpaceChatReportParams {
  spaceId: string;
  reportId: string;
  messageId?: string;
  actions: Array<"remove-message" | "ban-user" | "dismiss">;
  summary?: string;
  /** The ban TARGET, not the moderator. */
  userId?: string;
  reason?: string;
  /** The acting moderator, for attribution. */
  actingUserId?: string;
}

/**
 * Hook to handle chat message reports at the space level.
 * Space moderators can: remove message, ban user from space, dismiss.
 *
 * `ban-user` is space-scoped (it sets the target's SpaceMember status to
 * "banned"). Project-wide suspension is a dashboard action, not one a space
 * moderator can take.
 *
 * @example
 * const handleSpaceChatReport = useHandleSpaceChatReport();
 *
 * await handleSpaceChatReport({
 *   spaceId: "space-uuid",
 *   reportId: "report-uuid",
 *   messageId: "message-uuid",
 *   actions: ["remove-message"],
 *   summary: "Removed abusive message"
 * });
 */
function useHandleSpaceChatReport(): (
  params: HandleSpaceChatReportParams
) => Promise<HandleReportResponse> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const handleSpaceChatReport = useCallback(
    async ({
      spaceId,
      reportId,
      messageId,
      actions,
      summary,
      userId,
      reason,
      actingUserId,
    }: HandleSpaceChatReportParams) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      if (!spaceId || !reportId) {
        throw new Error("spaceId and reportId are required");
      }

      const response = await axios.patch(
        `/${projectId}/spaces/${spaceId}/chat/reports/${reportId}`,
        {
          messageId,
          actions,
          summary,
          userId,
          reason,
          actingUserId,
        }
      );

      return response.data as HandleReportResponse;
    },
    [projectId, axios]
  );

  return handleSpaceChatReport;
}

export default useHandleSpaceChatReport;
