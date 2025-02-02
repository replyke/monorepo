import { useContext } from "react";
import { SheetManagerContext } from "../context/SheetManagerContext";

export default function useSheetManager() {
  return useContext(SheetManagerContext);
}
