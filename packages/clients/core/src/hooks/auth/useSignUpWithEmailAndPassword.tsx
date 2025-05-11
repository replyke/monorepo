import { useCallback } from "react";
import useProject from "../projects/useProject";
import axios from "../../config/axios";
import { isReactNative } from "../../utils/isReactNative";

function useSignUpWithEmailAndPassword() {
  const { projectId } = useProject();

  const signUpWithEmailAndPassword = useCallback(
    async ({
      email,
      password,
      name,
      username,
      avatar,
      bio,
      location,
      birthdate,
      metadata,
      secureMetadata,
    }: {
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
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const response = await axios.post(
        `/${projectId}/auth/sign-up`,
        {
          email,
          password,
          name: name?.trim(),
          username: username?.trim(),
          avatar,
          bio: bio?.trim(),
          location,
          birthdate,
          metadata,
          secureMetadata,
        },
        { withCredentials: !isReactNative() }
      );

      const { accessToken, refreshToken, user } = response.data;

      return { accessToken, refreshToken, user };
    },
    [projectId]
  );

  return signUpWithEmailAndPassword;
}

export default useSignUpWithEmailAndPassword;
