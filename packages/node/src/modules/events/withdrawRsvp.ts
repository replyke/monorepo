import { SublayHttpClient } from "../../core/client";
import { Event } from "../../interfaces/Event";

export interface WithdrawRsvpProps {
  eventId: string;
  /** Act on behalf of a user (service/master key); defaults to the caller. */
  userId?: string;
}

export async function withdrawRsvp(
  client: SublayHttpClient,
  data: WithdrawRsvpProps
): Promise<Event> {
  const { eventId, ...body } = data;
  const response = await client.projectInstance.delete<Event>(
    `/events/${eventId}/rsvp`,
    { data: body }
  );
  return response.data;
}
