import { useMemo, useState } from "react";
import {
  handleError,
  ReportReasonKey,
  reportReasons,
  useCommentSection,
  useCreateReport,
  useUser,
} from "@replyke/react-js";
import { FlagIcon } from "@replyke/ui-core-react-js";
import useUIState from "../../../hooks/use-ui-state";
import { cn } from "@/lib/utils";

function ReportContent({ resetView }: { resetView: () => void }) {
  const { user } = useUser();
  const { callbacks } = useCommentSection();
  const { optionsComment, closeCommentOptionsModal } = useUIState();
  const createCommentReport = useCreateReport({ type: "comment" });

  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState<ReportReasonKey | null>(null);

  const buttonActive = useMemo(
    () => !!reason && !!optionsComment,
    [reason, optionsComment]
  );

  const handleSubmitReport = async () => {
    try {
      if (!optionsComment) throw new Error("No comment to report selected");
      if (!reason) throw new Error("No reason to report selected");
      if (!user) {
        callbacks?.loginRequiredCallback?.();
        return;
      }
      if (!user.username && callbacks?.usernameRequiredCallback) {
        callbacks.usernameRequiredCallback();
        return;
      }
      setSubmitting(true);
      await createCommentReport({ targetId: optionsComment.id, reason });
      closeCommentOptionsModal?.();
      setReason(null);
      resetView();
    } catch (err) {
      handleError(err, "Submitting report failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 w-full">
      <div className="flex items-center gap-4">
        <FlagIcon size={24} color="currentColor" className="text-gray-900 dark:text-gray-50" />
        <span className="text-2xl text-gray-900 dark:text-gray-50">Submit a report</span>
      </div>
      <p className="mt-6 text-gray-700 dark:text-gray-300">
        Thank you for looking out for our community. Let us know what is
        happening, and we'll look into it.
      </p>

      <div className="flex flex-wrap gap-1.5 mt-6">
        {Object.entries(reportReasons).map(([key, value], index) => (
          <button
            onClick={() => setReason(key as ReportReasonKey)}
            key={index}
            className={cn(
              "px-2 py-1 rounded-md cursor-pointer text-sm",
              key === reason
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                : "bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
            )}
          >
            {value}
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmitReport}
        disabled={!buttonActive}
        className={cn(
          "w-full mt-4",
          "inline-flex items-center justify-center",
          "px-4 py-2",
          "text-sm font-medium leading-5",
          "rounded-md",
          "transition-colors duration-200",
          buttonActive
            ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 cursor-pointer"
            : "bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-500 cursor-not-allowed"
        )}
      >
        {submitting ? "Submitting.." : "Submit Report"}
      </button>
    </div>
  );
}

export default ReportContent;
