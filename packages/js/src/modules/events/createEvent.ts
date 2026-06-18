import { SublayHttpClient } from "../../core/client";
import { Event, EventType, EventVisibility } from "../../interfaces/Event";

export interface CreateEventProps {
  title: string;
  description?: string;
  startTime: string; // ISO datetime
  endTime?: string; // ISO datetime
  timezone?: string;
  type: EventType;
  url?: string;
  venueName?: string;
  address?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  spaceId?: string;
  visibility?: EventVisibility; // defaults to "public" server-side
  capacity?: number;
  allowMaybe?: boolean;
  guestListVisible?: boolean;
  /** Additional host user IDs (the creator is auto-added as a host). */
  hostIds?: string[];
  metadata?: Record<string, any>;
}

export async function createEvent(
  client: SublayHttpClient,
  data: CreateEventProps
): Promise<Event> {
  const response = await client.projectInstance.post<Event>(`/events`, data);
  return response.data;
}
