import { SublayHttpClient } from "../../core/client";

export interface UnlinkIdentityProps {
  identityId: string;
}

export async function unlinkIdentity(
  client: SublayHttpClient,
  data: UnlinkIdentityProps
): Promise<void> {
  const { identityId } = data;
  await client.projectInstance.delete(`/oauth/identities/${identityId}`);
}
