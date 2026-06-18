import { SublayHttpClient } from "../../core/client";
import { EventRsvp } from "../../interfaces/Event";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchEventRsvpsProps {
  eventId: string;
  page?: number;
  limit?: number; // capped at 100 server-side
  /**
   * Comma-separated RSVP statuses to filter by, e.g. "going,maybe". When
   * omitted, all statuses are returned.
   */
  status?: string;
}

/**
 * Named RSVP (guest) list. Visible to hosts always, to any viewer when the
 * event's `guestListVisible` is true, or to service/master keys; otherwise 403.
 * RSVP counts themselves are public via the event's `rsvpCounts`.
 */
export async function fetchEventRsvps(
  client: SublayHttpClient,
  data: FetchEventRsvpsProps
): Promise<PaginatedResponse<EventRsvp>> {
  const { eventId, ...params } = data;
  const response = await client.projectInstance.get<
    PaginatedResponse<EventRsvp>
  >(`/events/${eventId}/rsvps`, { params });
  return response.data;
}
