import { SublayHttpClient } from "../../core/client";

export interface DeleteEventProps {
  eventId: string;
}

export async function deleteEvent(
  client: SublayHttpClient,
  data: DeleteEventProps
): Promise<void> {
  await client.projectInstance.delete<void>(`/events/${data.eventId}`);
}
