import "./index.css";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { ReplykeProvider, useSignTestingJwt } from "@replyke/react-js";
import { AuthProvider } from "./context/auth-provider";
import { useAuth } from "./context/use-auth";
import App from "./App";

const PROJECT_ID = import.meta.env.VITE_PROJECT_ID as string;
const PRIVATE_KEY = import.meta.env.VITE_PRIVATE_KEY as string | undefined;

if (!PROJECT_ID) {
  throw new Error(
    "VITE_PROJECT_ID is not set. Copy .env.example to .env and fill in your values."
  );
}

// Wraps the app with a signed token derived from the mock user.
// Mirrors the pattern used in the landing page sandbox.
function ReplykeWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const signTestingJwt = useSignTestingJwt();
  const [token, setToken] = useState<string | undefined>();

  useEffect(() => {
    if (!user || !PRIVATE_KEY) {
      setToken(undefined);
      return;
    }
    signTestingJwt({
      projectId: PROJECT_ID,
      privateKey: PRIVATE_KEY,
      payload: {
        id: user.username,
        username: user.username,
      },
    }).then(setToken);
  }, [user, signTestingJwt]);

  return (
    <ReplykeProvider projectId={PROJECT_ID} signedToken={token ?? null}>
      {children}
    </ReplykeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <ReplykeWrapper>
        <App />
      </ReplykeWrapper>
    </AuthProvider>
  </React.StrictMode>
);
