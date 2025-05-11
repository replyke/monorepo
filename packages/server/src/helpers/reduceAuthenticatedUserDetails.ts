import { ISuspension } from "../interfaces/ISuspension";
import IUser from "../interfaces/IUser";

export default function reduceAuthenticatedUserDetails(
  user: Partial<IUser> & { suspensions: ISuspension[] }
) {
  return {
    id: user.id,
    foreignId: user.foreignId,
    role: user.role,
    email: user.email,
    name: user.name,
    username: user.username,
    avatar: user.avatar,
    metadata: user.metadata,
    reputation: user.reputation,
    isVerified: user.isVerified,
    isActive: user.isActive,
    lastActive: user.lastActive,
    suspensions: user.suspensions,
  };
}
