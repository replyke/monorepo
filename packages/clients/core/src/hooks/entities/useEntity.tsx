"use client";

import { useContext } from "react";
import {
  EntityContext,
  EntityContextValues,
} from "../../context/entity-context";

export default function useEntity(): Partial<EntityContextValues> {
  return useContext(EntityContext);
}
