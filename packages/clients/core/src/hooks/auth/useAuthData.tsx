import { useState, useEffect, useCallback } from "react";

import { handleError } from "../../utils/handleError";
import { AuthUser } from "../../interfaces/models/User";
import { isReactNative } from "../../utils/isReactNative";
import useSignUpWithEmailAndPassword from "../../hooks/auth/useSignUpWithEmailAndPassword";
import useSignInWithEmailAndPassword from "../../hooks/auth/useSignInWithEmailAndPassword";
import useSignOut from "./useSignOut";
import useRequestNewAccessToken from "./useRequestNewAccessToken";
import useVerifyExternalUser from "./useVerifyExternalUser";
import useChangePassword from "./useChangePassword";

export interface UseAuthDataProps {
  signedToken?: string | null | undefined;
}

export interface UseAuthDataValues {
  loadingInitial: boolean;
  user: AuthUser | null;
  setUser: (newUser: AuthUser) => void;
  accessToken: string | null;
  refreshToken: string | null;
  setRefreshToken: React.Dispatch<React.SetStateAction<string | null>>;
  signUpWithEmailAndPassword: (props: {
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
  }) => Promise<void>;
  signInWithEmailAndPassword: (props: {
    email: string;
    password: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (props: {
    publicKeyBase64: string | null;
    email: string;
    password: string;
    newPassword: string;
  }) => Promise<void>;
  requestNewAccessToken: () => Promise<void>;
}

function useAuthData({ signedToken }: UseAuthDataProps): UseAuthDataValues {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  const signUpWithEmailAndPassword = useSignUpWithEmailAndPassword();
  const signInWithEmailAndPassword = useSignInWithEmailAndPassword();
  const signOut = useSignOut();
  const changePassword = useChangePassword();
  const requestNewAccessToken = useRequestNewAccessToken();
  const verifyExternalUser = useVerifyExternalUser();

  const handleSignUpWithEmailAndPassword = useCallback(
    async (props: {
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
    }) => {
      try {
        const response = await signUpWithEmailAndPassword({
          ...props,
        });

        if (response) {
          setRefreshToken(response.refreshToken);
          setAccessToken(response.accessToken);
          setUser(response.user);
        }
      } catch (err) {
        handleError(err, "Failed to register user with email and password: ");
        if (err instanceof Error) {
          throw err;
        }
      }
    },
    [signUpWithEmailAndPassword]
  );

  const handleSignInWithEmailAndPassword = useCallback(
    async (props: { email: string; password: string }) => {
      try {
        const response = await signInWithEmailAndPassword({
          ...props,
        });

        if (response) {
          setRefreshToken(response.refreshToken);
          setAccessToken(response.accessToken);
          setUser(response.user);
        }
      } catch (err) {
        handleError(err, "Failed to log user in: ");
        if (err instanceof Error) {
          throw err;
        }
      }
    },
    [signInWithEmailAndPassword]
  );

  const handleSignOut = useCallback(async () => {
    if (isReactNative() && !refreshToken) throw new Error("No refresh token");

    const tempUser = user;
    const tempAccessToken = accessToken;
    const tempRefreshToken = refreshToken;

    try {
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);

      await signOut({ refreshToken });
    } catch (err) {
      handleError(err, "Failed to log user out: ");
      setUser(tempUser);
      setAccessToken(tempAccessToken);
      setRefreshToken(tempRefreshToken);
      if (err instanceof Error) {
        throw err;
      }
    }
  }, [signOut, user, accessToken, refreshToken]);

  const handleChangePassword = useCallback(
    async (props: { password: string; newPassword: string }) => {
      if (!user) throw new Error("No user is authenticated");

      try {
        await changePassword({
          ...props,
        });
      } catch (err) {
        handleError(err, "Failed to log user in: ");
      }
    },
    [changePassword, user]
  );

  const handleRequestNewAccessToken = useCallback(async () => {
    if (isReactNative() && !refreshToken) return;
    try {
      const response = await requestNewAccessToken({ refreshToken });
      if (response) {
        setUser(response.user);
        setAccessToken(response.accessToken);
        return response.accessToken;
      }
    } catch (err: unknown) {
      handleError(err, "Request new access token error: ");
    }
  }, [requestNewAccessToken, refreshToken]);

  const handleVerifyExternalUser = useCallback(async () => {
    if (!signedToken) return;

    try {
      const response = await verifyExternalUser({ userJwt: signedToken });

      if (response) {
        setRefreshToken(response.refreshToken);
        setAccessToken(response.accessToken);
        setUser(response.user);
      }
    } catch (err: unknown) {
      handleError(err, "Verify external user error: ");
    }
  }, [signedToken, verifyExternalUser]);

  useEffect(() => {
    handleVerifyExternalUser();
  }, [handleVerifyExternalUser]);

  useEffect(() => {
    const fetchInitial = () => {
      setTimeout(async () => {
        await handleRequestNewAccessToken();
        setLoadingInitial(false);
      }, 0);
    };
    fetchInitial();
  }, [handleRequestNewAccessToken]);

  return {
    loadingInitial,
    user,
    setUser: (newUser: AuthUser) => setUser(newUser),
    accessToken,
    refreshToken,
    setRefreshToken,
    signUpWithEmailAndPassword: handleSignUpWithEmailAndPassword,
    signInWithEmailAndPassword: handleSignInWithEmailAndPassword,
    signOut: handleSignOut,
    changePassword: handleChangePassword,
    requestNewAccessToken: handleRequestNewAccessToken,
  };
}

export default useAuthData;
