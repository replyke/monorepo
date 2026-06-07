import { SublayHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";

export interface FetchUserSuggestionsProps {
  query: string;
}

export async function fetchUserSuggestions(
  client: SublayHttpClient,
  data: FetchUserSuggestionsProps
): Promise<User[]> {
  const response = await client.projectInstance.get<User[]>(
    "/users/suggestions",
    { params: data }
  );
  return response.data;
}
