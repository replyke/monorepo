import { SublayHttpClient } from "../../core/client";
import { PushDeviceIdentifier } from "../../interfaces/Push";

export interface ChangePasswordProps {
  userId: string;
  /** The user's current password (verified before the change). */
  password: string;
  newPassword: string;
  /**
   * Optional. One physical device whose push binding should SURVIVE the
   * change.
   *
   * A password change deletes every push binding the user holds, so an
   * intruder's device stops receiving notification content. A server-side
   * caller normally has no device to name and should omit this — every binding
   * then goes, which is the right default when acting on someone's behalf.
   * Supply it only when your own client told you which device it is on and you
   * want that one to keep receiving notifications.
   */
  pushDevice?: PushDeviceIdentifier;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

/**
 * Change a user's password.
 *
 * Ends every session for that user, so all their devices must sign in again
 * with the new password. (A call made by a signed-in user with their own
 * access token keeps that one session; a service key is not a session, so
 * there is nothing to spare here.)
 */
export async function changePassword(
  client: SublayHttpClient,
  data: ChangePasswordProps
): Promise<ChangePasswordResponse> {
  const response = await client.projectInstance.post<ChangePasswordResponse>(
    "/auth/change-password",
    data
  );
  return response.data;
}
