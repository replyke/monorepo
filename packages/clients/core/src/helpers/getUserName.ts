import { User } from "../interfaces/models/User";

export const getUserName = (user: Partial<User>, priority: 'name' | 'username' = 'username'): string => {
  if (priority === 'username' && user.username) return user.username;
  if (priority === 'name' && user.name) return user.name;

  // Fallback to the other field if priority is not available
  if (user.username) return user.username;
  if (user.name) return user.name;

  // Generate a fallback value based on user ID
  if (user.id)
    return "user-" + user?.id?.split("-")[0].split("").reverse().join("");

  // Final fallback
  return "Invalid User Details";
};
