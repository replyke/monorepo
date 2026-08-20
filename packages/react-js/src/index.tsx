import React from "react";
import {
  SublayProvider as CoreSublayProvider,
  SublayIntegrationProvider as CoreSublayIntegrationProvider,
} from "@sublay/core";
import AccountManager from "./AccountManager";

// Re-export all exports from @sublay/core
export * from "@sublay/core";

// Web-only OAuth hook (uses window.location for redirect-based flow)
export { default as useOAuthSignIn, type UseOAuthSignInReturn } from "./hooks/useOAuthSignIn";

// Web Push adapter (browser Notification + Push API, no native dependencies)
export { webPushTokenAdapter } from "./PushTokenAdapter";

// Override SublayProvider to inject AccountManager
export const SublayProvider: React.FC<{
  projectId: string;
  signedToken?: string | null | undefined;
  children: React.ReactNode;
}> = ({ projectId, signedToken, children }) => {
  return (
    <CoreSublayProvider projectId={projectId} signedToken={signedToken}>
      <>
        <AccountManager />
        {children}
      </>
    </CoreSublayProvider>
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
