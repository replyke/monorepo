import { differenceInMinutes } from "date-fns";
import { IEntityAttributes } from "../interfaces/IEntity";

const validateEntityDataForScoring = (
  entity: IEntityAttributes & { repliesCount: number }
) => {
  // Check `scoreUpdatedAt` validity
  if (!entity.scoreUpdatedAt) {
    console.error("Missing `scoreUpdatedAt` in entity.");
    throw new Error("Invalid entity: `scoreUpdatedAt` is required.");
  }

  // Check `createdAt` validity
  if (!entity.createdAt) {
    console.error("Missing or invalid `createdAt` in entity.");
    throw new Error("Invalid entity: `createdAt` is required.");
  }

  // Validate that `createdAt` is not in the future
  if (new Date(entity.createdAt) > new Date()) {
    console.error("`createdAt` is in the future:");
    throw new Error("Invalid entity: `createdAt` cannot be in the future.");
  }

  // Validate numerical fields
  if (!Array.isArray(entity.upvotes)) {
    console.error("Invalid `upvotes` field:", entity.upvotes);
    throw new Error("Invalid entity: `upvotes` must be an array.");
  }
  if (!Array.isArray(entity.downvotes)) {
    console.error("Invalid `downvotes` field:", entity.downvotes);
    throw new Error("Invalid entity: `downvotes` must be an array.");
  }
  if (typeof entity.repliesCount !== "number") {
    console.error("Invalid `repliesCount` field:", entity.repliesCount);
    throw new Error("Invalid entity: `repliesCount` must be a number.");
  }
  if (typeof entity.sharesCount !== "number") {
    console.error("Invalid `sharesCount` field:", entity.sharesCount);
    throw new Error("Invalid entity: `sharesCount` must be a number.");
  }

  // Validate `views`
  if (typeof entity.views !== "number" || entity.views <= 0) {
    console.error("Invalid `views` field:", entity.views);
    throw new Error("Invalid entity: `views` must be a positive number.");
  }
};

const GAP_IN_MINUTES_BETWEEN_RESCORING = 5;

export default function scoreEntity(
  entity: IEntityAttributes & { repliesCount: number }
): { newScore: number; newScoreUpdatedAt: Date; updated: boolean } {
  validateEntityDataForScoring(entity);

  const currentStateReturn = {
    updated: false,
    newScore: entity.score,
    newScoreUpdatedAt: entity.scoreUpdatedAt,
  };

  // Validate `scoreUpdatedAt`
  if (
    entity.scoreUpdatedAt &&
    differenceInMinutes(new Date(), new Date(entity.scoreUpdatedAt)) <=
      GAP_IN_MINUTES_BETWEEN_RESCORING
  ) {
    return currentStateReturn;
  }

  const upvotesCount = entity.upvotes.length;
  const downvotesCount = entity.downvotes.length;
  const repliesCount = entity.repliesCount;
  const sharesCount = entity.sharesCount;
  const views = Math.max(entity.views, 1); // Ensure views is at least 1
  const createdAt = entity.createdAt;

  // Weight factors for different elements of the score
  const UPVOTE_WEIGHT = 1;
  const DOWNVOTE_WEIGHT = -0.5;
  const REPLY_WEIGHT = 0.5;
  const SHARE_WEIGHT = 2;

  // Base interaction score
  const interactionScore =
    UPVOTE_WEIGHT * upvotesCount +
    DOWNVOTE_WEIGHT * downvotesCount +
    REPLY_WEIGHT * repliesCount +
    SHARE_WEIGHT * sharesCount;

  // Base score for all posts, decays over time
  const BASE_SCORE = 2; // Starting score for new posts
  const HALF_LIFE = 48; // Half-life in hours for the base score decay

  // Calculate time since publication in hours
  const time_since_publication =
    (new Date().getTime() - new Date(createdAt!).getTime()) / (3600 * 1000);

  // Calculate decay factor for the base score
  const base_decay = Math.exp(-time_since_publication / HALF_LIFE);

  // Adjust the base score with decay
  const baseAdjustedScore = BASE_SCORE * base_decay;

  // Adjust interaction score by views to normalize for exposure
  const exposureAdjustedScore = interactionScore / Math.log2(views + 1);

  // Combine base score and interaction score
  const final_score = Math.max(0, baseAdjustedScore + exposureAdjustedScore);

  return {
    updated: true,
    newScore: parseFloat(final_score.toFixed(2)),
    newScoreUpdatedAt: new Date(),
  };
}
