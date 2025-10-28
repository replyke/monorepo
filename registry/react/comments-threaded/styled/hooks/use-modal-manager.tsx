import { useContext } from "react";
import { ModalManagerContext } from "../context/modal-manager-context";

export default function useModalManager() {
  return useContext(ModalManagerContext);
}
