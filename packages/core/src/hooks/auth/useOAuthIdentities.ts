import { useState, useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";

export interface OAuthIdentity {
  id: string;
  provider: string;
  providerAccountId: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface UseOAuthIdentitiesReturn {
  identities: OAuthIdentity[];
  hasPassword: boolean;
  fetchIdentities: () => Promise<void>;
  unlinkIdentity: ({ identityId }: { identityId: string }) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

function useOAuthIdentities(): UseOAuthIdentitiesReturn {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();
  const [identities, setIdentities] = useState<OAuthIdentity[]>([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIdentities = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/${projectId}/oauth/identities`);
      setIdentities(response.data.identities);
      setHasPassword(Boolean(response.data.hasPassword));
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, axios]);

  const unlinkIdentity = useCallback(
    async ({ identityId }: { identityId: string }) => {
      if (!projectId) return;
      setIsLoading(true);
      setError(null);
      try {
        await axios.delete(`/${projectId}/oauth/identities/${identityId}`);
        setIdentities((prev) => prev.filter((i) => i.id !== identityId));
      } catch (err: any) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, axios]
  );

  return { identities, hasPassword, fetchIdentities, unlinkIdentity, isLoading, error };
}

export default useOAuthIdentities;
