import React from "react";

function IndentationThreadingLines({ isLastReply }: { isLastReply: boolean }) {
  return (
    <>
      {/* Vertical line from parent thread continuing down - only if not the last reply */}
      {!isLastReply && (
        <div
          className="absolute w-px bg-gray-300 dark:bg-gray-500 z-0 h-full"
          style={{
            // 🎨 CUSTOMIZATION: Threading line position
            left: "-12px",
            top: "0px",
          }}
        ></div>
      )}

      {/* Vertical line from parent thread to this comment's branch point */}
      <div
        className="absolute w-px bg-gray-300 dark:bg-gray-500 z-0"
        style={{
          // 🎨 CUSTOMIZATION: Threading line position
          top: "-8px",
          height: "18px",
          left: "-12px",
        }}
      ></div>

      {/* Curved branch connecting parent line to child avatar */}
      <div
        className="absolute z-0 border-l-[1.5px] border-b-[1.5px] border-gray-300 dark:border-gray-500 border-t-[1.5px] border-t-transparent border-r-[1.5px] border-r-transparent rounded-bl-xl"
        style={{
          // 🎨 CUSTOMIZATION: Threading line position
          top: "10px",
          width: "12px",
          height: "16px",
          left: "-12px",
        }}
      ></div>
    </>
  );
}

export default IndentationThreadingLines;
