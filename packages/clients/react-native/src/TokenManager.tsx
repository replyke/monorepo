import { useEffect } from "react";
import { handleError, useAuth } from "@replyke/core";
import * as Keychain from "react-native-keychain";

const REFRESH_TOKEN_KEY = "replyke-refresh-token";

function TokenManager() {
  const { refreshToken, setRefreshToken } = useAuth();

  // Function to store the refresh token securely
  const handleTokenStorage = async (newToken: string | null | undefined) => {
    try {
      if (newToken) {
        // Save the token using Keychain
        await Keychain.setGenericPassword(REFRESH_TOKEN_KEY, newToken, {
          service: REFRESH_TOKEN_KEY,
        });
      } else {
        // Remove the token from Keychain
        await Keychain.resetGenericPassword({ service: REFRESH_TOKEN_KEY });
      }
    } catch (err) {
      handleError(err, "Failed to handle token storage");
    }
  };

  // Function to retrieve the refresh token from secure storage
  const handleTokenRetrieval = async () => {
    if (!setRefreshToken) throw new Error("Invalid setRefreshToken function");

    try {
      const credentials = await Keychain.getGenericPassword({
        service: REFRESH_TOKEN_KEY,
      });
      if (credentials) {
        setRefreshToken(credentials.password);
      }
    } catch (err) {
      handleError(err, "Failed to handle token retrieval");
    }
  };

  useEffect(() => {
    handleTokenRetrieval();
  }, []);

  useEffect(() => {
    handleTokenStorage(refreshToken);
  }, [refreshToken]);

  return null;
}

export default TokenManager;
