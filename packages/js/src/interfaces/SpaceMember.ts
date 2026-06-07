import { PaginatedResponse } from "./IPaginatedResponse";
import { SpaceMemberRole, SpaceMemberStatus } from "./Space";

export interface SpaceMember {
  id: string;
  projectId: string;
  spaceId: string;
  userId: string;
  role: SpaceMemberRole;
  status: SpaceMemberStatus;
  joinedAt: string;
  createdAt: string;
}

// Returned from fetchSpaceMembers
export interface SpaceMemberWithUser {
  membershipId: string;
  role: SpaceMemberRole;
  status: SpaceMemberStatus;
  joinedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    metadata: object;
  };
}

export type SpaceMembersResponse = PaginatedResponse<SpaceMemberWithUser>;

// Response for fetching space team (admins + moderators, no pagination)
export interface SpaceTeamResponse {
  data: SpaceMemberWithUser[];
}
