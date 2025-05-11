export const validUserRoles = ["admin", "editor", "visitor"] as const;

export type IUserRole = (typeof validUserRoles)[number];
