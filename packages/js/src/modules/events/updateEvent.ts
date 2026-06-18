import { SublayHttpClient } from "../../core/client";
import { Event, EventType, EventVisibility } from "../../interfaces/Event";
import { appendField, appendFields, appendFile } from "../../core/multipart";
import type { EventCoverUpload, EventGalleryUpload } from "./createEvent";

export interface UpdateEventProps {
  eventId: string;
  title?: string;
  description?: string;
  startTime?: string; // ISO datetime
  endTime?: string; // ISO datetime
  timezone?: string;
  type?: EventType;
  url?: string;
  venueName?: string;
  address?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  visibility?: EventVisibility;
  capacity?: number;
  allowMaybe?: boolean;
  guestListVisible?: boolean;
  metadata?: Record<string, any>;
  /**
   * New cover image (single) — REPLACES the existing cover. When present the
   * request is sent as `multipart/form-data`. Requires the `files-images` bundle.
   */
  cover?: EventCoverUpload;
  /**
   * Gallery images (multi) — APPENDED to the event's existing images. When
   * present the request is sent as `multipart/form-data`. Requires the
   * `files-images` bundle.
   */
  gallery?: EventGalleryUpload;
}

export async function updateEvent(
  client: SublayHttpClient,
  data: UpdateEventProps
): Promise<Event> {
  const { eventId, cover, gallery, ...body } = data;
  const path = `/events/${eventId}`;

  const hasCover = !!cover;
  const hasGallery = !!gallery && gallery.files.length > 0;

  if (hasCover || hasGallery) {
    const formData = new FormData();

    if (cover) {
      appendFile(formData, "cover", cover.file, { fallback: "cover" });
      appendField(formData, "cover.options", cover.options);
    }
    if (hasGallery) {
      gallery!.files.forEach((file) =>
        appendFile(formData, "gallery", file, { fallback: "gallery" })
      );
      appendField(formData, "gallery.options", gallery!.options);
    }

    appendFields(formData, body);

    const response = await client.projectInstance.patch<Event>(path, formData);
    return response.data;
  }

  const response = await client.projectInstance.patch<Event>(path, body);
  return response.data;
}
