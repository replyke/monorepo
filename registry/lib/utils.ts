/**
 * Stand-in for the `@/lib/utils` module every consumer project already has.
 *
 * The tailwind-style templates under registry/react/**\/tailwind import
 * `cn` from "@/lib/utils" — the shadcn/ui convention. In a real consumer
 * project that alias resolves to the project's own lib/utils.ts; inside this
 * repo, registry/tsconfig.json maps `@/*` to `./*`, so it resolves here.
 *
 * This file exists so `tsc --noEmit` over registry/ can type-check the
 * templates the way a consumer project would compile them. It is NOT part of
 * any component: no registry.json lists it, so `sublay add` never copies it,
 * and nothing here is published. Keep the signature identical to the shadcn
 * `cn` the templates are written against — if it drifts, the typecheck stops
 * reflecting how the templates actually compile downstream.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
