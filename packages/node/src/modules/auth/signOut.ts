import { SublayHttpClient } from "../../core/client";
import { PushDeviceIdentifier } from "../../interfaces/Push";

export interface SignOutProps {
  refreshToken: string;
  /**
   * Optional. When supplied — and the project has the `push` bundle — the
   * server deletes this user's push binding for that device in the SAME
   * transaction as the token-family destroy: signing out unbinds the device's
   * push, or nothing happens at all.
   *
   * If the unbind fails the request fails (HTTP 500, code
   * `auth/device-deregistration-failed`) and NOTHING is committed — the
   * session survives so the caller can retry. Do not treat a failed sign-out
   * as signed out.
   *
   * Omit it and the request is byte-identical to before this field existed.
   */
  pushDevice?: PushDeviceIdentifier;
}

export async function signOut(
  client: SublayHttpClient,
  data: SignOutProps
): Promise<void> {
  await client.projectInstance.post("/auth/sign-out", data);
}
