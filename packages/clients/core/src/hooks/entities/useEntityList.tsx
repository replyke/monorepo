"use client";

import { useContext } from "react";
import {
  EntityListContext,
  EntityListContextValues,
} from "../../context/entity-list-context";

export default function useEntityList(): Partial<EntityListContextValues> {
  return useContext(EntityListContext);
}
