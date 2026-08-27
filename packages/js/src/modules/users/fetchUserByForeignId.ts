import { SublayHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";
import { SpaceReputationUserParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../core/spaceReputationParams";

export interface FetchUserByForeignIdProps extends SpaceReputationUserParams {
  foreignId: string;
  include?: string;
}

// Note: the server's `createIfNotFound` flag (and the accompanying creation
// fields name/username/avatar/bio/metadata/secureMetadata) is gated to
// service/master keys only (`req.isService || req.isMaster` in the controller).
// A user token cannot use it, so it is intentionally omitted here.
export async function fetchUserByForeignId(
  client: SublayHttpClient,
  data: FetchUserByForeignIdProps
): Promise<User> {
  const {
    spaceReputation,
    spaceReputationId,
    spaceReputationDescendants,
    ...rest
  } = data;
  const response = await client.projectInstance.get<User>(
    "/users/by-foreign-id",
    {
      params: {
        ...rest,
        ...buildSpaceReputationParams({
          spaceReputation,
          spaceReputationId,
          spaceReputationDescendants,
        }),
      },
    }
  );
  return response.data;
}
