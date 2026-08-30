import { useContext } from "react";
import { UIStateContext } from "../context/ui-state-context";

export default function useUIState() {
  return useContext(UIStateContext);
}
