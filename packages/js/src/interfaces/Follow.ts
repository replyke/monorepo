import { User } from "./User";

export interface Follow {
  id: string;
  projectId: string;
  followerId: string;
  followedId: string;
  createdAt: string;
}

/**
 * An entry in a follower/following list. The list endpoints
 * (`/follows/(followers|following)` and `/users/:userId/(followers|following)`)
 * return the follow id, the populated other user, and when the follow happened
 * — NOT the raw {@link Follow} row.
 */
export interface FollowListItem {
  followId: string;
  user: User;
  followedAt: string;
}
