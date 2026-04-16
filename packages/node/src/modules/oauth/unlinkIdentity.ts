import { ReplykeHttpClient } from "../../core/client";

export interface UnlinkIdentityProps {
  identityId: string;
}

export async function unlinkIdentity(
  client: ReplykeHttpClient,
  data: UnlinkIdentityProps
): Promise<void> {
  const { identityId } = data;
  await client.projectInstance.delete(`/oauth/identities/${identityId}`);
}
