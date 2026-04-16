import { ReplykeHttpClient } from "../../core/client";

export interface SignOutProps {
  refreshToken: string;
}

export async function signOut(
  client: ReplykeHttpClient,
  data: SignOutProps
): Promise<void> {
  await client.projectInstance.post("/auth/sign-out", data);
}
