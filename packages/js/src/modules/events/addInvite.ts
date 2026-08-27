import { SublayHttpClient } from "../../core/client";
import { Event } from "../../interfaces/Event";

export interface AddInviteProps {
  eventId: string;
  /** The user to invite (userId only — never a foreignId). Idempotent. */
  userId: string;
}

export async function addInvite(
  client: SublayHttpClient,
  data: AddInviteProps
): Promise<Event> {
  const { eventId, userId } = data;
  const response = await client.projectInstance.post<Event>(
    `/events/${eventId}/invites`,
    { userId }
  );
  return response.data;
}
