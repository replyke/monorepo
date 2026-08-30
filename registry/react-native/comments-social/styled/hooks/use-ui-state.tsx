import { useContext } from "react";
import { UIStateContext } from "../context/ui-state-context";

function useUIState() {
  const context = useContext(UIStateContext);

  if (!context) {
    throw new Error("useUIState must be used within UIStateProvider");
  }

  return context;
}

export default useUIState;
