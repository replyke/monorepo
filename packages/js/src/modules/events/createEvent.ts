import { SublayHttpClient } from "../../core/client";
import { Event, EventType, EventVisibility } from "../../interfaces/Event";
import { ImageOptions } from "../../interfaces/ImageProcessing";
import { appendField, appendFields, appendFile } from "../../core/multipart";

/** A single cover image plus its processing options (stored as Event.coverImageId). */
export interface EventCoverUpload {
  file: Blob | File;
  /** Image-processing config (must include `mode`) — see {@link ImageOptions}. */
  options: ImageOptions;
}

/** A gallery image set plus shared processing options (Files with eventId + position). */
export interface EventGalleryUpload {
  files: (Blob | File)[];
  /** Image-processing config applied to every gallery image — see {@link ImageOptions}. */
  options: ImageOptions;
}

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
  /** Additional host user IDs (the logged-in user is auto-added as a host). */
  hostIds?: string[];
  metadata?: Record<string, any>;
  /**
   * Inline cover image (single). When present the request is sent as
   * `multipart/form-data`. Requires the `files-images` bundle.
   */
  cover?: EventCoverUpload;
  /**
   * Inline gallery images (multi). When present the request is sent as
   * `multipart/form-data`. Requires the `files-images` bundle.
   */
  gallery?: EventGalleryUpload;
}

export async function createEvent(
  client: SublayHttpClient,
  data: CreateEventProps
): Promise<Event> {
  const { cover, gallery, ...body } = data;

  const hasCover = !!cover;
  const hasGallery = !!gallery && gallery.files.length > 0;

  if (hasCover || hasGallery) {
    const formData = new FormData();

    // Files go under `cover`/`gallery`; their options ride alongside as
    // `cover.options` / `gallery.options` JSON strings (the createEvent schema
    // parses them). Object fields (location/hostIds/metadata) and booleans are
    // stringified by appendFields; the server coerces them back.
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

    const response = await client.projectInstance.post<Event>(
      "/events",
      formData
    );
    return response.data;
  }

  const response = await client.projectInstance.post<Event>("/events", body);
  return response.data;
}
