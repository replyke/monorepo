import React from "react";
import {
  SublayProvider as OriginalSublayProvider,
  SublayIntegrationProvider as CoreSublayIntegrationProvider,
} from "@sublay/core";

// Re-export all exports from @sublay/core
export * from "@sublay/core";
import AccountManager from "./AccountManager";

// Expo-specific OAuth hook (system browser + deep-link return)
export { default as useOAuthSignIn, type UseOAuthSignInReturn } from "./hooks/useOAuthSignIn";

// Expo-specific PushTokenAdapter (expo-notifications)
export { expoPushTokenAdapter } from "./PushTokenAdapter";

// Override SublayProvider
export const SublayProvider: React.FC<{
  projectId: string;
  signedToken?: string | null | undefined;
  children: React.ReactNode;
}> = ({ projectId, signedToken, children }) => {
  return (
    <OriginalSublayProvider projectId={projectId} signedToken={signedToken}>
      <>
        <AccountManager />
        {children}
      </>
    </OriginalSublayProvider>
  );
};

// Override SublayIntegrationProvider to inject AccountManager.
//
// Core's version is re-exported untouched by `export * from "@sublay/core"`
// above, and an explicit local export shadows a star export — the same shape
// this file already uses for `SublayProvider`.
//
// Without this, integration mode persists NOTHING: `AccountManager` carries the
// platform's storage adapter, so core cannot mount one itself, and the account
// map stayed memory-only for the whole session. (Core's provider already waits
// a microtask for an `AccountManager` to register and blocks on its ready
// signal — machinery that only makes sense if one were expected to arrive.)
// It matters more now that the same map carries `pushEnabled` and the device
// identifier, both of which are meant to be durable.
export const SublayIntegrationProvider: React.FC<{
  projectId: string;
  signedToken?: string | null;
  children: React.ReactNode;
}> = ({ projectId, signedToken, children }) => {
  return (
    <CoreSublayIntegrationProvider
      projectId={projectId}
      signedToken={signedToken}
    >
      <>
        <AccountManager />
        {children}
      </>
    </CoreSublayIntegrationProvider>
  );
};
