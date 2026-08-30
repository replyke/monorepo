import { SublayHttpClient } from "../../core/client";
import { Event } from "../../interfaces/Event";

export interface RemoveInviteProps {
  eventId: string;
  /** The invitee to remove. Also drops their RSVP and revokes access. */
  userId: string;
}

export async function removeInvite(
  client: SublayHttpClient,
  data: RemoveInviteProps
): Promise<Event> {
  const { eventId, userId } = data;
  const response = await client.projectInstance.delete<Event>(
    `/events/${eventId}/invites`,
    { data: { userId } }
  );
  return response.data;
}
