import { SublayHttpClient } from "../../core/client";
import { EventInvite } from "../../interfaces/Event";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchInviteesProps {
  eventId: string;
  page?: number;
  limit?: number; // capped at 100 server-side
}

/**
 * Host-only invitee (guest) list. Non-hosts (and non-service keys) get 403.
 */
export async function fetchInvitees(
  client: SublayHttpClient,
  data: FetchInviteesProps
): Promise<PaginatedResponse<EventInvite>> {
  const { eventId, ...params } = data;
  const response = await client.projectInstance.get<
    PaginatedResponse<EventInvite>
  >(`/events/${eventId}/invites`, { params });
  return response.data;
}
