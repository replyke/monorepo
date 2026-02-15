import React from "react";
import { View } from "react-native";
import useUIState from "../../../../hooks/use-ui-state";

function IndentationThreadingLines({ isLastReply }: { isLastReply: boolean }) {
  const { theme } = useUIState();
  const lineColor = theme === 'dark' ? 'bg-gray-500' : 'bg-gray-300';

  return (
    <>
      {/* Vertical line from parent thread continuing down - only if not the last reply */}
      {!isLastReply && (
        <View
          className={`absolute w-px z-0 h-full ${lineColor}`}
          style={{
            left: -12,
            top: 0,
          }}
        />
      )}

      {/* Vertical line from parent thread to this comment's branch point */}
      <View
        className={`absolute w-px z-0 ${lineColor}`}
        style={{
          top: -8,
          height: 18,
          left: -12,
        }}
      />

      {/* Curved branch connecting parent line to child avatar */}
      <View
        className={`absolute z-0 rounded-bl-xl ${
          theme === 'dark' ? 'border-gray-500' : 'border-gray-300'
        }`}
        style={{
          top: 10,
          width: 12,
          height: 16,
          left: -12,
          borderLeftWidth: 1.5,
          borderBottomWidth: 1.5,
          borderTopWidth: 1.5,
          borderTopColor: 'transparent',
          borderRightWidth: 1.5,
          borderRightColor: 'transparent',
        }}
      />
    </>
  );
}

export default IndentationThreadingLines;
