import { Comment } from "./models/Comment";

export type EntityCommentsTree = {
  [id: string]: {
    comment: Comment;
    replies: { [id: string]: Comment & { new: boolean } };
    new: boolean;
    failed?: boolean;
  };
};
