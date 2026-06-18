import { SublayHttpClient } from "../../core/client";
import { Event, RsvpStatus } from "../../interfaces/Event";

export interface SetRsvpProps {
  eventId: string;
  status: RsvpStatus;
}

export async function setRsvp(
  client: SublayHttpClient,
  data: SetRsvpProps
): Promise<Event> {
  const { eventId, status } = data;
  const response = await client.projectInstance.post<Event>(
    `/events/${eventId}/rsvp`,
    { status }
  );
  return response.data;
}
