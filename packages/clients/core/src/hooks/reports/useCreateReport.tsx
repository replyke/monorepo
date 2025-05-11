import useAxiosPrivate from "../../config/useAxiosPrivate";
import { ReportReasonKey } from "../../constants/reportReasons";
import useProject from "../projects/useProject";
import useUser from "../users/useUser";

function useCreateReport() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();
  const { user } = useUser();

  const createReport = async ({
    targetId,
    targetType,
    reason,
    details,
  }: {
    targetId: string;
    targetType: "Comment" | "Entity";
    reason: ReportReasonKey;
    details?: string;
  }) => {
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
      { withCredentials: true }
    );
  };

  const createCommentReport = async ({
    targetId,
    reason,
    details,
  }: {
    targetId: string;
    reason: ReportReasonKey;
    details?: string;
  }) => {
    await createReport({
      targetId,
      targetType: "Comment",
      reason,
      details,
    });
  };

  const createEntityReport = async ({
    targetId,
    reason,
    details,
  }: {
    targetId: string;
    reason: ReportReasonKey;
    details?: string;
  }) => {
    await createReport({
      targetId,
      targetType: "Entity",
      reason,
      details,
    });
  };

  return { createCommentReport, createEntityReport };
}

export default useCreateReport;
