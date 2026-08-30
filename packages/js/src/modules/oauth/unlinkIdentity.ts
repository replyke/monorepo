import { SublayHttpClient } from "../../core/client";

export interface UnlinkIdentityProps {
  identityId: string;
}

export interface UnlinkIdentityResponse {
  success: boolean;
}

/**
 * Unlink one of the current user's OAuth identities (authenticated). The server
 * refuses to remove the last identity if the user has no password set.
 */
export async function unlinkIdentity(
  client: SublayHttpClient,
  data: UnlinkIdentityProps
): Promise<UnlinkIdentityResponse> {
  const { identityId } = data;
  const response = await client.projectInstance.delete<UnlinkIdentityResponse>(
    `/oauth/identities/${identityId}`
  );
  return response.data;
}
