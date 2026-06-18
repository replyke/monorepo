import { User } from "./User";
import { Space } from "./Space";
import { File } from "./File";

export type EventType = "online" | "physical" | "hybrid";
export type EventVisibility = "public" | "members" | "invite";
export type EventStatus = "active" | "cancelled";
export type RsvpStatus = "going" | "maybe" | "not_going";

export interface RsvpCounts {
  going: number;
  maybe: number;
  not_going: number;
}

export interface Event {
  id: string;
  shortId: string;
  projectId: string;
  userId: string | null; // creator (SET NULL on user delete)
  user?: User | null; // Populated when include contains "user"
  title: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  timezone: string | null;
  type: EventType;
  url: string | null;
  venueName: string | null;
  address: string | null;
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  } | null;
  spaceId: string | null; // soft reference — no enforced cross-bundle FK
  space?: Space | null; // Populated when include contains "space"
  visibility: EventVisibility;
  status: EventStatus;
  allowMaybe: boolean;
  guestListVisible: boolean;
  capacity: number | null;
  hostIds: string[];
  coverImageId: string | null;
  files?: File[]; // Populated when include contains "files"
  rsvpCounts: RsvpCounts;
  userRsvp?: RsvpStatus | null; // Present with include "userRsvp" + auth
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface EventRsvp {
  id: string;
  eventId: string;
  userId: string;
  user?: User | null; // Populated on guest-list reads
  status: RsvpStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EventInvite {
  id: string;
  eventId: string;
  userId: string;
  user?: User | null; // Populated on invitee-list reads
  invitedAt: string;
  createdAt: string;
  updatedAt: string;
}
