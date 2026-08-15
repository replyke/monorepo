import React, { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { sublayStore } from "../store";
import type { ReactNode } from "react";
import { useSublayDispatch, useSublaySelector } from "../store/hooks";
import { initializeAuthThunk } from "../store/slices/authThunks";
import {
  selectAccountsReady,
  selectAccountManagerRegistered,
} from "../store/slices/accountsSlice";
import useAuthGate from "../hooks/auth/useAuthGate";

export interface SublayStoreProviderProps {
  children: ReactNode;
  projectId: string;
  signedToken?: string | null;
}

/**
 * Component that initializes auth state in Redux
 * Must be inside the Redux Provider to dispatch actions
 */
const AuthInitializer: React.FC<{
  children: ReactNode;
  projectId: string;
  signedToken?: string | null;
}> = ({ children, projectId, signedToken }) => {
  const dispatch = useSublayDispatch();
  const accountsReady = useSublaySelector(selectAccountsReady);
  const accountManagerRegistered = useSublaySelector(selectAccountManagerRegistered);
  const [hasWaitedForManager, setHasWaitedForManager] = useState(false);

  // Holds outbound requests until the bootstrap below settles. `children` still
  // render immediately — only the requests wait.
  useAuthGate(projectId);

  // Give AccountManager one microtask to register itself
  useEffect(() => {
    Promise.resolve().then(() => setHasWaitedForManager(true));
  }, []);

  useEffect(() => {
    // Still waiting for the microtask check
    if (!hasWaitedForManager) return;

    // If an AccountManager registered, wait until it signals ready
    if (accountManagerRegistered && !accountsReady) return;

    // Either: no AccountManager (core-only user) OR AccountManager is ready
    dispatch(initializeAuthThunk({ projectId, signedToken }));
  }, [dispatch, projectId, signedToken, hasWaitedForManager, accountManagerRegistered, accountsReady]);

  return <>{children}</>;
};

/**
 * Redux store provider for Sublay
 * This component provides the Redux store and initializes auth state
 */
export const SublayStoreProvider: React.FC<SublayStoreProviderProps> = ({ 
  children,
  projectId,
  signedToken
}) => {
  return (
    <Provider store={sublayStore}>
      <AuthInitializer projectId={projectId} signedToken={signedToken}>
        {children}
      </AuthInitializer>
    </Provider>
  );
};

// Clean Redux-only architecture
// Always integrated with SublayProvider

export default SublayStoreProvider;