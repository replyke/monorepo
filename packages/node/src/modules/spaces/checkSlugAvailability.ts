import { ReplykeHttpClient } from "../../core/client";

export interface CheckSlugAvailabilityProps {
  slug: string;
}

export interface CheckSlugAvailabilityResponse {
  available: boolean;
}

export async function checkSlugAvailability(
  client: ReplykeHttpClient,
  data: CheckSlugAvailabilityProps
): Promise<CheckSlugAvailabilityResponse> {
  const response =
    await client.projectInstance.get<CheckSlugAvailabilityResponse>(
      "/spaces/check-slug",
      { params: data }
    );
  return response.data;
}
