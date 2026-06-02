import { SublayHttpClient } from "../../core/client";

export interface SignOutProps {
  refreshToken: string;
}

export async function signOut(
  client: SublayHttpClient,
  data: SignOutProps
): Promise<void> {
  await client.projectInstance.post("/auth/sign-out", data);
}
