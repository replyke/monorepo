"use client";

import { useState } from "react";
import { Modal, resetDiv } from "@replyke/ui-core-react-js";
import useModalManager from "../../../hooks/useModalManager";
import MainContent from "./MainContent";
import ReportContent from "./ReportContent";

function CommentMenuModal() {
  const { isCommentOptionsModalOpen, closeCommentOptionsModal } =
    useModalManager();

  const [view, setView] = useState<"main" | "report">("main");

  return (
    <Modal
      show={!!isCommentOptionsModalOpen}
      onClose={() => {
        closeCommentOptionsModal?.();
        setView("main");
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...resetDiv,
          backgroundColor: "white",
          borderRadius: 8,
          width: "100%",
          maxWidth: 520,
          alignSelf: "center",
          paddingTop: 8,
          paddingBottom: 8,
        }}
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
