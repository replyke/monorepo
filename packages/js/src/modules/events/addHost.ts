import { SublayHttpClient } from "../../core/client";
import { Event } from "../../interfaces/Event";

export interface AddHostProps {
  eventId: string;
  /** The user to grant host on the event. */
  userId: string;
}

export async function addHost(
  client: SublayHttpClient,
  data: AddHostProps
): Promise<Event> {
  const { eventId, userId } = data;
  const response = await client.projectInstance.post<Event>(
    `/events/${eventId}/hosts`,
    { userId }
  );
  return response.data;
}
