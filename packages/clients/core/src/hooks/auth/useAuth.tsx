"use client";

import { useContext } from "react";
import { AuthContext, AuthContextValues } from "../../context/auth-context";

export default function useAuth(): Partial<AuthContextValues>  {
  return useContext(AuthContext);
}
