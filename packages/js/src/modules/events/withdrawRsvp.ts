import { SublayHttpClient } from "../../core/client";
import { Event } from "../../interfaces/Event";

export interface WithdrawRsvpProps {
  eventId: string;
}

export async function withdrawRsvp(
  client: SublayHttpClient,
  data: WithdrawRsvpProps
): Promise<Event> {
  const response = await client.projectInstance.delete<Event>(
    `/events/${data.eventId}/rsvp`
  );
  return response.data;
}
