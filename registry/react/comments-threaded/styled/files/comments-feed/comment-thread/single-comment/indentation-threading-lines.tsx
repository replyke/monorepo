import React from "react";

function IndentationThreadingLines({ isLastReply }: { isLastReply: boolean }) {
  return (
    <>
      {/* Vertical line from parent thread continuing down - only if not the last reply */}
      {!isLastReply && (
        <div
          style={{
            position: "absolute",
            width: "1px",
            // 🎨 CUSTOMIZATION: Threading line color (Default: gray-300)
            backgroundColor: "#D1D5DB",
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
          // 🎨 CUSTOMIZATION: Threading line color (Default: gray-300)
          backgroundColor: "#D1D5DB",
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
          // 🎨 CUSTOMIZATION: Threading line color (Default: gray-300)
          borderLeft: "1.5px solid #D1D5DB",
          borderBottom: "1.5px solid #D1D5DB",
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
