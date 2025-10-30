import { useState } from "react";
import { Modal, resetDiv } from "@replyke/ui-core-react-js";
import { cn } from "@/lib/utils";
import useUIState from "../../../hooks/use-ui-state";
import MainContent from "./main-content";
import ReportContent from "./report-content";

function CommentMenuModal() {
  const {
    isCommentMenuModalOpen,
    closeCommentMenuModal
  } = useUIState();

  const [view, setView] = useState<"main" | "report">("main");

  return (
    <Modal
      show={!!isCommentMenuModalOpen}
      onClose={() => {
        closeCommentMenuModal?.();
        setView("main");
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={resetDiv}
        className={cn(
          "bg-white dark:bg-gray-800",
          "rounded-lg",
          "w-full max-w-[520px]",
          "self-center",
          "py-2"
        )}
      >
        {view === "main" && (
          <MainContent clickReport={() => setView("report")} />
        )}

        {view === "report" && (
          <ReportContent resetView={() => setView("main")} />
        )}
      </div>
    </Modal>
  );
}

export default CommentMenuModal;
