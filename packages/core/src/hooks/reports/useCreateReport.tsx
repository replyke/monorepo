import useAxiosPrivate from "../../config/useAxiosPrivate";
import { ReportReasonKey } from "../../constants/reportReasons";
import useProject from "../projects/useProject";
import { useUser } from "../user";

export type ReportTargetType = "comment" | "entity" | "message";

export interface UseCreateReportProps {
  type: ReportTargetType;
}

export interface CreateReportProps {
  targetId: string;
  targetType: ReportTargetType;
  reason: ReportReasonKey;
  details?: string;
}

export interface CreateCommentReportProps {
  targetId: string;
  reason: ReportReasonKey;
  details?: string;
}

export interface CreateEntityReportProps {
  targetId: string;
  reason: ReportReasonKey;
  details?: string;
}

/**
 * `targetId` is the message id. The conversation is resolved server-side, so
 * no conversationId is needed. The reporter must be a member of the
 * conversation, and may not report their own message.
 */
export interface CreateMessageReportProps {
  targetId: string;
  reason: ReportReasonKey;
  details?: string;
}

function useCreateReport({ type }: UseCreateReportProps):
  | ((props: CreateCommentReportProps) => Promise<void>)
  | ((props: CreateEntityReportProps) => Promise<void>)
  | ((props: CreateMessageReportProps) => Promise<void>) {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();
  const { user } = useUser();

  const createReport = async ({
    targetId,
    targetType,
    reason,
    details,
  }: CreateReportProps) => {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    if (!user) {
      throw new Error("No user is logged in");
    }

    await axios.post(
      `/${projectId}/reports`,
      {
        targetId,
        targetType,
        reason,
        details,
      },
    );
  };

  const createCommentReport = async ({
    targetId,
    reason,
    details,
  }: CreateCommentReportProps) => {
    await createReport({
      targetId,
      targetType: "comment",
      reason,
      details,
    });
  };

  const createEntityReport = async ({
    targetId,
    reason,
    details,
  }: CreateEntityReportProps) => {
    await createReport({
      targetId,
      targetType: "entity",
      reason,
      details,
    });
  };

  const createMessageReport = async ({
    targetId,
    reason,
    details,
  }: CreateMessageReportProps) => {
    await createReport({
      targetId,
      targetType: "message",
      reason,
      details,
    });
  };

  if (type === "comment") {
    return createCommentReport;
  } else if (type === "entity") {
    return createEntityReport;
  } else if (type === "message") {
    return createMessageReport;
  }

  throw new Error("Invalid report type");
}

export default useCreateReport;
