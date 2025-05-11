import { useEffect } from "react";
import { handleError, useAuth } from "@replyke/core";
import * as SecureStore from "expo-secure-store";

function TokenManager() {
  const { refreshToken, setRefreshToken } = useAuth();
  // TODO: Should we manage the state of the refresh token here? And call the request new access token using that refresh token here?
  const handleTokenStorage = async (newToken: string | null | undefined) => {
    try {
      if (newToken) {
        SecureStore.setItem("replyke-refresh-token", newToken);
      } else {
        await SecureStore.deleteItemAsync("replyke-refresh-token");
      }
    } catch (err) {
      handleError(err, "Failed to handle token storage");
    }
  };

  const handleTokenRetrieval = async () => {
    if (!setRefreshToken) throw new Error("Invalid setRefreshToken function");

    try {
      const storedToken = await SecureStore.getItemAsync(
        "replyke-refresh-token"
      );
      if (storedToken) setRefreshToken(storedToken);
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
