import { SublayHttpClient } from "../../core/client";
import { Event } from "../../interfaces/Event";

export interface RemoveHostProps {
  eventId: string;
  /** The host to remove. Rejected if it would leave the event with no hosts. */
  userId: string;
}

export async function removeHost(
  client: SublayHttpClient,
  data: RemoveHostProps
): Promise<Event> {
  const { eventId, userId } = data;
  const response = await client.projectInstance.delete<Event>(
    `/events/${eventId}/hosts`,
    { data: { userId } }
  );
  return response.data;
}
