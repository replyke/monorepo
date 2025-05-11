import { useState, useEffect, useCallback } from "react";

function useTextareaCursorIndicator({
  textAreaRef,
}: {
  textAreaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [isSelectionActive, setIsSelectionActive] = useState<boolean>(false);

  const updateCursorAndSelection = useCallback(() => {
    if (textAreaRef.current) {
      const { selectionStart, selectionEnd } = textAreaRef.current;
      setCursorPosition(selectionStart);
      setIsSelectionActive(selectionStart !== selectionEnd);
    }
  }, [textAreaRef]);

  useEffect(() => {
    const textArea = textAreaRef.current;

    if (textArea) {
      textArea.addEventListener("input", updateCursorAndSelection);
      textArea.addEventListener("click", updateCursorAndSelection);
      textArea.addEventListener("keydown", updateCursorAndSelection);
      textArea.addEventListener("keyup", updateCursorAndSelection);

      return () => {
        textArea.removeEventListener("input", updateCursorAndSelection);
        textArea.removeEventListener("click", updateCursorAndSelection);
        textArea.removeEventListener("keydown", updateCursorAndSelection);
        textArea.removeEventListener("keyup", updateCursorAndSelection);
      };
    }
  }, [updateCursorAndSelection, textAreaRef]);

  return { textAreaRef, cursorPosition, isSelectionActive };
}

export default useTextareaCursorIndicator;
