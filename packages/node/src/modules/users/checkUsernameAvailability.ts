import { ReplykeHttpClient } from "../../core/client";

export interface CheckUsernameAvailabilityProps {
  username: string;
}

export interface CheckUsernameAvailabilityResponse {
  available: boolean;
}

export async function checkUsernameAvailability(
  client: ReplykeHttpClient,
  data: CheckUsernameAvailabilityProps
): Promise<CheckUsernameAvailabilityResponse> {
  const response =
    await client.projectInstance.get<CheckUsernameAvailabilityResponse>(
      "/users/check-username",
      { params: data }
    );
  return response.data;
}
