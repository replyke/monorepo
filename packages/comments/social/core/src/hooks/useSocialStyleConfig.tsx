"use client";

import { useContext } from "react";
import {
  SocialStyleConfigContext,
  SocialStyleConfigContextValues,
} from "../context/social-style-config-context";

export default function useSocialStyleConfig(): Partial<SocialStyleConfigContextValues> {
  return useContext(SocialStyleConfigContext);
}
