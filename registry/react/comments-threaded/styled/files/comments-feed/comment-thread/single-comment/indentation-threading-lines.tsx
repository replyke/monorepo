import React from "react";

function IndentationThreadingLines({ isLastReply }: { isLastReply: boolean }) {
  // 🎨 CUSTOMIZATION: Threading line color
  const threadingLineColor = "#D1D5DB"; // Default: gray-300
  return (
    <>
      {/* Vertical line from parent thread continuing down - only if not the last reply */}
      {!isLastReply && (
        <div
          style={{
            position: "absolute",
            width: "1px",
            backgroundColor: threadingLineColor,
            zIndex: 0,
            left: "-12px",
            top: "0px",
            height: "100%",
          }}
        ></div>
      )}

      {/* Vertical line from parent thread to this comment's branch point */}
      <div
        style={{
          position: "absolute",
          top: "-8px",
          width: "1px",
          height: "18px",
          backgroundColor: threadingLineColor,
          zIndex: 0,
          left: "-12px",
        }}
      ></div>

      {/* Curved branch connecting parent line to child avatar */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          width: "12px",
          height: "16px",
          borderLeft: `1.5px solid ${threadingLineColor}`,
          borderBottom: `1.5px solid ${threadingLineColor}`,
          borderTop: "1.5px solid transparent",
          borderRight: "1.5px solid transparent",
          borderBottomLeftRadius: "12px",
          zIndex: 0,
          left: "-12px",
        }}
      ></div>
    </>
  );
}

export default IndentationThreadingLines;
