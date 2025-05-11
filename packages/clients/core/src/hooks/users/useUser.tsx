"use client";

import { useContext } from "react";
import { UserContext, UserContextValues } from "../../context/user-context";

export default function useUser(): Partial<UserContextValues> {
  return useContext(UserContext);
}
