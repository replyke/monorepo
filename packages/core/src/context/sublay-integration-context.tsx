import React, { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useSublayDispatch, useSublaySelector } from "../store/hooks";
import { initializeAuthThunk } from "../store/slices/authThunks";
import {
  selectAccountsReady,
  selectAccountManagerRegistered,
} from "../store/slices/accountsSlice";
import { selectInitialized } from "../store/slices/authSlice";
import { SublayContext } from "./sublay-context";
import useProjectData from "../hooks/projects/useProjectData";
import useAuthGate from "../hooks/auth/useAuthGate";

export interface SublayIntegrationProviderProps {
  children: ReactNode;
  projectId: string;
  signedToken?: string | null;
}

/**
 * Component that initializes auth state in Redux.
 * Must be inside a Redux Provider to dispatch actions.
 */
const AuthInitializer: React.FC<{
  children: ReactNode;
  projectId: string;
  signedToken?: string | null;
}> = ({ children, projectId, signedToken }) => {
  const dispatch = useSublayDispatch();
  const accountsReady = useSublaySelector(selectAccountsReady);
  const accountManagerRegistered = useSublaySelector(selectAccountManagerRegistered);
  const initialized = useSublaySelector(selectInitialized);
  const [hasWaitedForManager, setHasWaitedForManager] = useState(false);

  // Holds outbound requests until the bootstrap below settles. `children` still
  // render immediately — only the requests wait.
  useAuthGate(projectId);

  // Give AccountManager one microtask to register itself
  useEffect(() => {
    Promise.resolve().then(() => setHasWaitedForManager(true));
  }, []);

  useEffect(() => {
    // Auth already bootstrapped (e.g. by OAuth callback) — skip
    if (initialized) return;

    // Still waiting for the microtask check
    if (!hasWaitedForManager) return;

    // If an AccountManager registered, wait until it signals ready
    if (accountManagerRegistered && !accountsReady) return;

    // Either: no AccountManager (core-only user) OR AccountManager is ready
    dispatch(initializeAuthThunk({ projectId, signedToken }));
  }, [dispatch, projectId, signedToken, hasWaitedForManager, accountManagerRegistered, accountsReady, initialized]);

  return <>{children}</>;
};

/**
 * Integration provider for Sublay (Integration Mode).
 *
 * Use this when you HAVE your own Redux store and want to integrate
 * Sublay's reducers into it. This provider does NOT create a Redux store -
 * you must wrap your app with your own Redux Provider.
 *
 * Prerequisites:
 * 1. Add sublayReducers under the 'sublay' key in your store
 * 2. Add sublayApiReducer under the 'sublayApi' key
 * 3. Add sublayMiddleware to your middleware chain
 *
 * @example
 * ```tsx
 * import { configureStore } from '@reduxjs/toolkit';
 * import { Provider } from 'react-redux';
 * import {
 *   SublayIntegrationProvider,
 *   sublayReducers,
 *   sublayApiReducer,
 *   sublayMiddleware
 * } from '@sublay/react-js';
 *
 * const store = configureStore({
 *   reducer: {
 *     sublay: sublayReducers,
 *     sublayApi: sublayApiReducer,
 *     ...yourReducers
 *   },
 *   middleware: (getDefault) => getDefault().concat(...sublayMiddleware)
 * });
 *
 * function App() {
 *   return (
 *     <Provider store={store}>
 *       <SublayIntegrationProvider projectId="..." signedToken={token}>
 *         <YourApp />
 *       </SublayIntegrationProvider>
 *     </Provider>
 *   );
 * }
 * ```
 */
export const SublayIntegrationProvider: React.FC<SublayIntegrationProviderProps> = ({
  children,
  projectId,
  signedToken,
}) => {
  // Provide projectId via context so hooks can access it
  const data = useProjectData({ projectId });

  // No Redux Provider here - user provides their own
  return (
    <SublayContext.Provider value={data}>
      <AuthInitializer projectId={projectId} signedToken={signedToken}>
        {children}
      </AuthInitializer>
    </SublayContext.Provider>
  );
};

export default SublayIntegrationProvider;
