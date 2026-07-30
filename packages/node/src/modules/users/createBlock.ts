import { SublayHttpClient } from "../../core/client";
import { Block } from "../../interfaces/Block";

export interface CreateBlockProps {
  /** The user being blocked (the target). */
  userId: string;
  /** The user performing the block (the blocker). */
  actingUserId: string;
}

export async function createBlock(
  client: SublayHttpClient,
  data: CreateBlockProps
): Promise<Block> {
  const { userId, actingUserId } = data;
  const response = await client.projectInstance.post<Block>(
    `/users/${userId}/block`,
    { actingUserId }
  );
  return response.data;
}
