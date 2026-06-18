import { SublayHttpClient } from "../../core/client";
import { Event, EventType, EventStatus } from "../../interfaces/Event";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface EventTextFilters {
  hasTitle?: "true" | "false";
  includes?: string | string[];
  doesNotInclude?: string | string[];
}

export interface EventDescriptionFilters {
  hasDescription?: "true" | "false";
  includes?: string | string[];
  doesNotInclude?: string | string[];
}

export interface EventLocationFilters {
  latitude: string;
  longitude: string;
  radius: string;
}

export interface FetchManyEventsProps {
  // Pagination
  page?: number;
  limit?: number; // capped at 100 server-side

  // Sorting
  sortBy?: "startTime" | "going";
  sortDir?: "asc" | "desc";

  // Time filtering: derived window OR explicit range
  timeWindow?: "upcoming" | "ongoing" | "past";
  startsAfter?: string; // ISO datetime
  startsBefore?: string; // ISO datetime

  // Scope / attribute filters
  spaceId?: string;
  hostId?: string;
  type?: EventType;
  status?: EventStatus; // defaults to "active" server-side

  /**
   * Comma-separated RSVP statuses the requester RSVP'd with, e.g. "going,maybe".
   * Requires `userId` to be set.
   */
  myRsvp?: string;

  // Geo proximity
  locationFilters?: EventLocationFilters;

  // Free-text filters
  titleFilters?: EventTextFilters;
  descriptionFilters?: EventDescriptionFilters;

  /** Comma-separated associations to expand, e.g. "user,space,files,userRsvp". */
  include?: string;
  /** Requester id — for `myRsvp` filter, `userRsvp` enrichment, and visibility. */
  userId?: string;
}

export async function fetchManyEvents(
  client: SublayHttpClient,
  data: FetchManyEventsProps = {}
): Promise<PaginatedResponse<Event>> {
  const response = await client.projectInstance.get<PaginatedResponse<Event>>(
    `/events`,
    { params: data }
  );
  return response.data;
}
