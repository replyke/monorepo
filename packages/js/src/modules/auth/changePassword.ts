import { SublayHttpClient } from "../../core/client";
import { PushDeviceIdentifier } from "../../interfaces/Push";

export interface ChangePasswordProps {
  /** The user's current password (verified before the change). */
  password: string;
  newPassword: string;
  /**
   * Optional. The physical device making this call.
   *
   * A password change also deletes every push binding the user holds, so an
   * intruder's device stops receiving notification content. Naming this device
   * keeps ITS binding — nothing re-binds a device from its live session, so
   * without this the handset the user just changed their password on goes
   * quiet until the app cold-starts or switches accounts.
   *
   * Same value passed to `push.register` / `auth.signOut`. Omit it and every
   * binding for the user goes, this device included.
   */
  pushDevice?: PushDeviceIdentifier;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

/**
 * Change the signed-in user's password.
 *
 * Ends every OTHER session for that user — every other device must sign in
 * again with the new password — while the session making this call survives.
 * The server identifies that session from the access token this request is
 * already authenticated with, so nothing about the caller's session has to be
 * sent.
 */
export async function changePassword(
  client: SublayHttpClient,
  data: ChangePasswordProps
): Promise<ChangePasswordResponse> {
  const response = await client.projectInstance.post<ChangePasswordResponse>(
    "/auth/change-password",
    {
      password: data.password,
      newPassword: data.newPassword,
      ...(data.pushDevice ? { pushDevice: data.pushDevice } : {}),
    }
  );
  return response.data;
}
