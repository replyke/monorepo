import { SublayHttpClient } from "../../core/client";
import { Event } from "../../interfaces/Event";

export interface CancelEventProps {
  eventId: string;
}

export async function cancelEvent(
  client: SublayHttpClient,
  data: CancelEventProps
): Promise<Event> {
  const response = await client.projectInstance.post<Event>(
    `/events/${data.eventId}/cancel`
  );
  return response.data;
}
