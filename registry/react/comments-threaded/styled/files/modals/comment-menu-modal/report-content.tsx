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
import useModalManager from "../../../hooks/use-modal-manager";

function ReportContent({ resetView }: { resetView: () => void }) {
  const { user } = useUser();
  const { callbacks } = useCommentSection();
  const { optionsComment, closeCommentOptionsModal, theme } = useModalManager();
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
    <div style={{ padding: 24, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <FlagIcon size={24} color={theme === 'dark' ? "#FFFFFF" : "#000"} />
        <span style={{ fontSize: "24px", color: theme === 'dark' ? "#F9FAFB" : "#111827" }}>Submit a report</span>
      </div>
      <p style={{ marginTop: "24px", color: theme === 'dark' ? "#D1D5DB" : "#374151" }}>
        Thank you for looking out for our community. Let us know what is
        happening, and we'll look into it.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          marginTop: "24px",
        }}
      >
        {Object.entries(reportReasons).map(([key, value], index) => (
          <button
            onClick={() => setReason(key as ReportReasonKey)}
            key={index}
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              backgroundColor: key === reason ? (theme === 'dark' ? "#FFFFFF" : "#000") : (theme === 'dark' ? "#4B5563" : "#e5e7eb"),
              cursor: "pointer",
              color: key === reason ? (theme === 'dark' ? "#000" : "#fff") : (theme === 'dark' ? "#9CA3AF" : "#9d9d9e"),
              fontSize: 14,
            }}
          >
            {value}
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmitReport}
        disabled={!buttonActive}
        style={{
          width: "100%",
          marginTop: 16,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.5rem 1rem",
          fontSize: "0.875rem",
          fontWeight: "500",
          lineHeight: "1.25",
          borderRadius: "0.375rem",
          backgroundColor: buttonActive ? (theme === 'dark' ? "#FFFFFF" : "#000") : (theme === 'dark' ? "#4B5563" : "#e5e7eb"),
          color: buttonActive ? (theme === 'dark' ? "#000" : "#ffffff") : (theme === 'dark' ? "#6B7280" : "#9d9d9e"),
          cursor: buttonActive ? "pointer" : "not-allowed",
          transition:
            "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease",
        }}
      >
        {submitting ? "Submitting.." : "Submit Report"}
      </button>
    </div>
  );
}

export default ReportContent;
