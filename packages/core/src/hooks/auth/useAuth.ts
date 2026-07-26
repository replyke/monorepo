import { useCallback } from 'react';
import { useSublayDispatch, useSublaySelector } from '../../store/hooks';
import {
  selectAccessToken,
  selectRefreshToken,
  selectInitialized,
  setRefreshToken
} from '../../store/slices/authSlice';
import { 
  signUpWithEmailAndPasswordThunk,
  signInWithEmailAndPasswordThunk,
  signOutThunk,
  changePasswordThunk,
  setPasswordThunk,
  requestNewAccessTokenThunk
} from '../../store/slices/authThunks';
import useProject from '../projects/useProject';

export interface SignUpWithEmailAndPasswordProps {
  email: string;
  password: string;
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  birthdate?: Date;
  metadata?: Record<string, any>;
  secureMetadata?: Record<string, any>;
  avatarFile?: File | Blob;
  avatarOptions?: any;
  bannerFile?: File | Blob;
  bannerOptions?: any;
}

export interface SignInWithEmailAndPasswordProps {
  email: string;
  password: string;
}

export interface ChangePasswordProps {
  password: string;
  newPassword: string;
}

export interface SetPasswordProps {
  newPassword: string;
}

// Define the interface to match the original useAuth hook
export interface UseAuthValues {
  initialized: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  setRefreshToken: React.Dispatch<React.SetStateAction<string | null>>;
  signUpWithEmailAndPassword: (props: SignUpWithEmailAndPasswordProps) => Promise<void>;
  signInWithEmailAndPassword: (props: SignInWithEmailAndPasswordProps) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (props: ChangePasswordProps) => Promise<void>;
  setPassword: (props: SetPasswordProps) => Promise<void>;
  requestNewAccessToken: () => Promise<string | undefined>;
}

export default function useAuth(): UseAuthValues {
  const dispatch = useSublayDispatch();
  const { projectId } = useProject();

  // Selectors
  const initialized = useSublaySelector(selectInitialized);
  const accessToken = useSublaySelector(selectAccessToken);
  const refreshToken = useSublaySelector(selectRefreshToken);

  // Actions
  const handleSignUpWithEmailAndPassword = useCallback(
    async (props: SignUpWithEmailAndPasswordProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const result = await dispatch(signUpWithEmailAndPasswordThunk({
        projectId,
        ...props,
      }));

      if (signUpWithEmailAndPasswordThunk.rejected.match(result)) {
        throw new Error(result.payload as string);
      }
    },
    [dispatch, projectId]
  );

  const handleSignInWithEmailAndPassword = useCallback(
    async (props: SignInWithEmailAndPasswordProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const result = await dispatch(signInWithEmailAndPasswordThunk({
        projectId,
        ...props,
      }));
      
      if (signInWithEmailAndPasswordThunk.rejected.match(result)) {
        throw new Error(result.payload as string);
      }
    },
    [dispatch, projectId]
  );

  const handleSignOut = useCallback(async () => {
    if (!projectId) {
      throw new Error("No projectId available.");
    }

    const result = await dispatch(signOutThunk({ projectId }));
    
    if (signOutThunk.rejected.match(result)) {
      throw new Error(result.payload as string);
    }
  }, [dispatch, projectId]);

  const handleChangePassword = useCallback(
    async (props: ChangePasswordProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const result = await dispatch(changePasswordThunk({
        projectId,
        ...props,
      }));
      
      if (changePasswordThunk.rejected.match(result)) {
        throw new Error(result.payload as string);
      }
    },
    [dispatch, projectId]
  );

  const handleSetPassword = useCallback(
    async (props: SetPasswordProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const result = await dispatch(setPasswordThunk({
        projectId,
        ...props,
      }));

      if (setPasswordThunk.rejected.match(result)) {
        throw new Error(result.payload as string);
      }
    },
    [dispatch, projectId]
  );

  const handleRequestNewAccessToken = useCallback(async () => {
    if (!projectId) return;

    const result = await dispatch(requestNewAccessTokenThunk({ projectId }));
    
    if (requestNewAccessTokenThunk.fulfilled.match(result)) {
      return result.payload;
    }
  }, [dispatch, projectId]);

  const handleSetRefreshToken = useCallback((token: React.SetStateAction<string | null>) => {
    // Handle both direct value and function setter patterns
    if (typeof token === 'function') {
      const currentToken = refreshToken;
      const newToken = token(currentToken);
      dispatch(setRefreshToken(newToken));
    } else {
      dispatch(setRefreshToken(token));
    }
  }, [dispatch, refreshToken]);

  return {
    initialized,
    accessToken,
    refreshToken,
    setRefreshToken: handleSetRefreshToken,
    signUpWithEmailAndPassword: handleSignUpWithEmailAndPassword,
    signInWithEmailAndPassword: handleSignInWithEmailAndPassword,
    signOut: handleSignOut,
    changePassword: handleChangePassword,
    setPassword: handleSetPassword,
    requestNewAccessToken: handleRequestNewAccessToken,
  };
}