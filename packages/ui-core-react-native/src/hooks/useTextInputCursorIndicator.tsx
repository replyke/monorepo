import { useState, useCallback } from "react";
import {
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from "react-native";

export default function useTextInputCursorIndicator() {
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [isSelectionActive, setIsSelectionActive] = useState<boolean>(false);

  const handleSelectionChange = useCallback(
    (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      const { selection } = event.nativeEvent;
      setCursorPosition(selection.start); // Keeps cursor position in sync
      setIsSelectionActive(selection.start !== selection.end);
    },
    []
  );

  const handleTextChange = useCallback((text: string) => {
    setIsSelectionActive(false); // Reset selection state if typing
    // No need to modify cursorPosition, as onSelectionChange will update it automatically
  }, []);

  return {
    cursorPosition,
    isSelectionActive,
    handleSelectionChange,
    handleTextChange,
  };
}
