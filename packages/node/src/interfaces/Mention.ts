export type Mention = UserMention | SpaceMention;

export interface UserMention {
  type: "user";
  id: string;
  foreignId?: string | null;
  username: string;
}

export interface SpaceMention {
  type: "space";
  id: string;
  slug: string;
}
