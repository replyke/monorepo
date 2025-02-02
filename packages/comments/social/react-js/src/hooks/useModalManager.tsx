import { useContext } from "react";
import { ModalManagerContext } from "../context/ModalManagerContext";

export default function useModalManager() {
  return useContext(ModalManagerContext);
}
