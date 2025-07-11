import { Mention } from "./Mention";
import { User } from "./User";

export interface TopComment {
  id: string;
  user: User;
  upvotesCount: number;
  content: string;
  createdAt: string;
}

export interface Entity {
  id: string; // Unique entity ID
  foreignId: string | null; // If integrated on top of existing data, this would be the id of the item in your system. Could also accept static values such as "about-page"
  shortId: string; // Automatically generated - also unique - could be used to generate sharing links
  projectId: string;
  user?: User | null;
  title: string | null;
  content: string | null;
  mentions: Mention[]; // Array of mentions of other users
  attachments: Record<string, any>[]; // Array of JSON objects representing information about media items (e.g. url, size, format etc). Flexible structure.
  keywords: string[]; // An array of keywords/tags. These could be used to filter the feed
  upvotes: string[]; // An array of ids of users that upvoted the entity
  downvotes: string[]; // An array of ids of users that downvoted the entity
  repliesCount: number; // A number representing how many comments and replies the entity has
  // sharesCount: number;
  views: number; // A number representing a count of how many views the entity received
  score: number; // A "hotness" score of ths entity. Automatically generated based on activity
  scoreUpdatedAt: Date; // Last tme the score was updated
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  } | null; // Optional location stored as GeoJSON. For example, if the entity is used to represent hotel listings
  metadata: Record<string, any>; // JSON object that could contain any other data about the entity which is relevant to the project. Limited to 10KB size.
  topComment: TopComment | null; // Optional field for top comment. As long as there is at least one comment it will be populated
  createdAt: Date; // Use camelCase for `created_at`
  updatedAt: Date; // Use camelCase for `updated_at`
  deletedAt: Date | null; // Use camelCase for `updated_at`
}
