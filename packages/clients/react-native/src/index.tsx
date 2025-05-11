import { ReplykeProvider as OriginalReplykeProvider } from "@replyke/core";

// Re-export all exports from @replyke/core
export * from "@replyke/core";
import TokenManager from "./TokenManager";

// Override ReplykeProvider
export const ReplykeProvider: React.FC<{
  projectId: string;
  signedToken?: string | null | undefined;
  children: React.ReactNode;
}> = ({ projectId, signedToken, children }) => {
  return (
    <OriginalReplykeProvider projectId={projectId} signedToken={signedToken}>
      <>
        <TokenManager />
        {children}
      </>
    </OriginalReplykeProvider>
  );
};
