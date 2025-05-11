import { Request as ExReq, Response as ExRes } from "express";
import { subDays, subHours, subMonths, subWeeks, subYears } from "date-fns";
import { Op } from "sequelize";

import { Entity } from "../../../models";
import { entityParams } from "../../../constants/sequelize-query-params";
import scoreEntity from "../../../helpers/scoreEntity";
import IEntity, { IEntityAttributes } from "../../../interfaces/IEntity";
import { KeywordsFilters } from "../../../interfaces/entity-query-filters/KeywordsFilters";
import { ContentFilters } from "../../../interfaces/entity-query-filters/ContentFilters";
import { TitleFilters } from "../../../interfaces/entity-query-filters/TitleFilters";
import { MetadataFilters } from "../../../interfaces/entity-query-filters/MetadataFilters";
import { AttachmentsFilters } from "../../../interfaces/entity-query-filters/AttachmentsFilters";
import { LocationFilters } from "../../../interfaces/entity-query-filters/LocationFilters";
import { getCoreConfig } from "../../../config";

const configureSort = (sortBy: unknown) => {
  const { sequelize } = getCoreConfig();
  let sort: any = [["createdAt", "DESC"]]; // Default is newest
  if (sortBy === "top") {
    sort = [
      [
        sequelize.literal(`
          (COALESCE(array_length(upvotes, 1), 0) - COALESCE(array_length(downvotes, 1), 0)) DESC,
          COALESCE(array_length(upvotes, 1), 0) DESC
          `),
      ],
      ["createdAt", "DESC"],
    ];
  } else if (sortBy === "hot") {
    sort = [["score", "DESC"]];
  } else if (sortBy === "controversial") {
    sort = [
      [
        sequelize.literal(`
          LOG(COALESCE(array_length(upvotes, 1), 0) + COALESCE(array_length(downvotes, 1), 0) + 1) *
          (LEAST(COALESCE(array_length(upvotes, 1), 0), COALESCE(array_length(downvotes, 1), 0)) /
           NULLIF(GREATEST(COALESCE(array_length(upvotes, 1), 0), COALESCE(array_length(downvotes, 1), 0)), 0))
        `),
        "DESC",
      ],
      ["createdAt", "DESC"], // Secondary sort by creation time for ties
    ];
  }

  return sort;
};

const configureTimeframe = (query: any, timeFrame: string | undefined) => {
  if (!timeFrame) return;

  let dateThreshold: Date | undefined;

  switch (timeFrame) {
    case "hour":
      dateThreshold = subHours(new Date(), 1);
      break;
    case "day":
      dateThreshold = subDays(new Date(), 1);
      break;
    case "week":
      dateThreshold = subWeeks(new Date(), 1);
      break;
    case "month":
      dateThreshold = subMonths(new Date(), 1);
      break;
    case "year":
      dateThreshold = subYears(new Date(), 1);
      break;
    default:
      throw new Error(
        "Invalid request: 'created_within' must be 'hour' 'day', 'week', 'month' or 'year'"
      );
  }

  query.createdAt = { [Op.gte]: dateThreshold }; // Use Sequelize's Op.gte operator for date filtering
};

const configureSourceId = (query: any, sourceId: string | undefined) => {
  if (!sourceId) return;

  query.sourceId = sourceId;
};

const configureUserId = (query: any, userId: string | undefined) => {
  if (!userId) return;

  query.userId = userId;
};

const configureKeywords = (
  query: any,
  keywordsFilters: KeywordsFilters | undefined
): void => {
  if (!keywordsFilters) return;

  // Extract "includes" and "doesNotInclude" as arrays of non-empty strings
  let included: string[] = [];
  let excluded: string[] = [];

  if (Array.isArray(keywordsFilters.includes)) {
    included = keywordsFilters.includes
      .filter((k) => typeof k === "string" && k.trim() !== "")
      .map((k) => k.trim());
  }

  if (Array.isArray(keywordsFilters.doesNotInclude)) {
    excluded = keywordsFilters.doesNotInclude
      .filter((k) => typeof k === "string" && k.trim() !== "")
      .map((k) => k.trim());
  }

  // Handle "includes" + "excludes" together
  // ----------------------------------------
  // 1) If both 'includes' and 'excludes' have data:
  //    => AND together { keywords: { [Op.contains]: included } }
  //       and { [Op.not]: { keywords: { [Op.overlap]: excluded } } }
  //
  // 2) If only 'includes' is set:
  //    => query.keywords = { [Op.contains]: included }
  //
  // 3) If only 'excludes' is set:
  //    => query[Op.not] = { keywords: { [Op.overlap]: excluded } }
  //
  // 4) If neither, do nothing.

  if (included.length > 0 && excluded.length > 0) {
    query[Op.and] = [
      // Must contain the included keywords
      { keywords: { [Op.contains]: included } },
      // Must NOT overlap with the excluded keywords
      { [Op.not]: { keywords: { [Op.overlap]: excluded } } },
    ];
  } else if (included.length > 0) {
    // Only includes
    query.keywords = { [Op.contains]: included };
  } else if (excluded.length > 0) {
    // Only excludes
    query[Op.not] = { keywords: { [Op.overlap]: excluded } };
  }
};

const configureTitle = (query: any, titleFilters: TitleFilters | undefined) => {
  if (!titleFilters) return;

  // Possible filters:
  // 1. Filtering by existence (e.g., hasTitle = true means title is not null)
  // 2. Filtering by text match (partial or exact)

  const { hasTitle, includes, doesNotInclude } = titleFilters;

  query.title = query.title || {}; // Ensure query.content is defined

  // Normalize 'includes' and 'doesNotInclude' to arrays and filter out invalid values
  const includesArray = Array.isArray(includes)
    ? includes
    : includes
    ? [includes]
    : [];
  const doesNotIncludeArray = Array.isArray(doesNotInclude)
    ? doesNotInclude
    : doesNotInclude
    ? [doesNotInclude]
    : [];

  const trimmedIncludesArray = includesArray
    .map((value) => value.trim())
    .filter(Boolean);
  const trimmedDoesNotIncludeArray = doesNotIncludeArray
    .map((value) => value.trim())
    .filter(Boolean);

  if (hasTitle === "true") {
    query.title[Op.ne] = null;
  } else if (hasTitle === "false") {
    query.title[Op.eq] = null;
  }

  // Apply 'like' filters (OR condition for matches)
  if (trimmedIncludesArray.length > 0) {
    query.title[Op.or] = trimmedIncludesArray.map((value) => ({
      [Op.iLike]: `%${value}%`,
    }));
  }

  // Apply 'notLike' filters (AND condition for exclusions)
  if (trimmedDoesNotIncludeArray.length > 0) {
    query.title[Op.and] = trimmedDoesNotIncludeArray.map((value) => ({
      [Op.notILike]: `%${value}%`,
    }));
  }
};

const configureContent = (
  query: any,
  contentFilters: ContentFilters | undefined
) => {
  if (!contentFilters) return;

  // Similar approach as title
  const { hasContent, includes, doesNotInclude } = contentFilters;

  // Normalize 'includes' and 'doesNotInclude' to arrays and filter out invalid values
  const includesArray = Array.isArray(includes)
    ? includes
    : includes
    ? [includes]
    : [];
  const doesNotIncludeArray = Array.isArray(doesNotInclude)
    ? doesNotInclude
    : doesNotInclude
    ? [doesNotInclude]
    : [];
  const trimmedIncludesArray = includesArray
    .map((value) => value.trim())
    .filter(Boolean);
  const trimmedDoesNotIncludeArray = doesNotIncludeArray
    .map((value) => value.trim())
    .filter(Boolean);

  query.content = query.content || {}; // Ensure query.content is defined

  if (hasContent === "true") {
    query.content[Op.ne] = null;
  } else if (hasContent === "false") {
    query.content[Op.eq] = null;
  }

  // Apply 'like' filters (OR condition for matches)
  if (trimmedIncludesArray.length > 0) {
    query.content[Op.or] = trimmedIncludesArray.map((value) => ({
      [Op.iLike]: `%${value}%`,
    }));
  }

  // Apply 'notLike' filters (AND condition for exclusions)
  if (trimmedDoesNotIncludeArray.length > 0) {
    query.content[Op.and] = trimmedDoesNotIncludeArray.map((value) => ({
      [Op.notILike]: `%${value}%`,
    }));
  }
};

const configureAttachments = (
  query: any,
  attachmentsFilters: AttachmentsFilters | undefined
) => {
  if (!attachmentsFilters) return;

  // Example: hasMedia = true/false to filter if entities have media
  // media array is empty if no media is present
  const { hasAttachments } = attachmentsFilters;

  if (hasAttachments === "true") {
    // Check that media array is not empty
    // array_length(media, 1) > 0
    // A simple way:
    query.attachments = { [Op.ne]: [] };
  } else if (hasAttachments === "false") {
    query.attachments = { [Op.eq]: [] };
  }
};

const configureLocation = (
  query: any,
  locationFilters: LocationFilters | undefined
) => {
  if (!locationFilters) return;
  const { sequelize } = getCoreConfig();

  const { latitude, longitude, radius } = locationFilters;

  // Parse values into numbers
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  const rad = parseFloat(radius);

  // Validate input
  const isValidLatitude = (lat: number) => lat >= -90 && lat <= 90;
  const isValidLongitude = (lon: number) => lon >= -180 && lon <= 180;
  const isValidRadius = (rad: number) => rad > 0;

  if (
    isNaN(lat) ||
    isNaN(lon) ||
    isNaN(rad) ||
    !isValidLatitude(lat) ||
    !isValidLongitude(lon) ||
    !isValidRadius(rad)
  ) {
    throw new Error(
      "Invalid location filters: latitude must be between -90 and 90, longitude between -180 and 180, and radius must be greater than 0."
    );
  }

  // Add filter to query using PostgreSQL's ST_DWithin for geo-spatial queries
  query[Op.and] = query[Op.and] || [];
  query[Op.and].push(
    sequelize.literal(`
      ST_DWithin(
        "Entity"."location"::geography,
        ST_MakePoint(${lon}, ${lat})::geography,
        ${rad}
      )
    `)
  );

  // The code below might be used some how to sort by distance. If we implement it later, then we need to see how to make it play with the already existing sort param (hot, top, new etc).
  // Currently we just comment that out. We simply limit results to the allowed distance but don't sort them by distance
  // Add sorting by distance
  // query.order = sequelize.literal(`
  //     ST_Distance(
  //       "Entity"."location"::geography,
  //       ST_MakePoint(${lon}, ${lat})::geography
  //     )
  //   `);
};

const configureMetadata = (
  query: any,
  metadataFilters: MetadataFilters | undefined
) => {
  if (!metadataFilters) return;
  const { sequelize } = getCoreConfig();

  if (
    typeof metadataFilters !== "object" ||
    Array.isArray(metadataFilters) ||
    metadataFilters === null
  ) {
    throw new Error("Invalid metadata filter: must be a non-null JSON object");
  }

  const {
    // contains,
    // doesNotContain,
    includes,
    doesNotInclude,
    doesNotExist,
    exists,
  } = metadataFilters as any;

  // Initialize a Sequelize `Op.and` array to build complex conditions
  const metadataConditions = [];

  // Helper function to serialize values (e.g., convert "true" -> true, "false" -> false)
  const serializeValues = (filterObject: Record<string, any>) => {
    Object.keys(filterObject).forEach((key) => {
      if (filterObject[key] === "true") {
        filterObject[key] = true;
      } else if (filterObject[key] === "false") {
        filterObject[key] = false;
      }
    });
    return filterObject;
  };

  // Handle 'includes'
  if (includes && typeof includes === "object") {
    const serializedIncludes = serializeValues({ ...includes });
    metadataConditions.push(
      sequelize.literal(
        `"Entity"."metadata" @> '${JSON.stringify(serializedIncludes)}'`
      )
    );
  }

  // Handle 'doesNotInclude'
  if (doesNotInclude && typeof doesNotInclude === "object") {
    const serializedNotIncludes = serializeValues({ ...doesNotInclude });
    Object.entries(serializedNotIncludes).forEach(([key, value]) => {
      metadataConditions.push(
        sequelize.literal(
          `NOT ("Entity"."metadata" @> '{"${key}": ${JSON.stringify(value)}}')`
        )
      );
    });
  }

  // Handle 'doesNotExist'
  if (Array.isArray(doesNotExist)) {
    doesNotExist.forEach((key) => {
      metadataConditions.push(
        sequelize.literal(`NOT ("Entity"."metadata" ? '${key}')`)
      );
    });
  }

  // Handle 'exists'
  if (Array.isArray(exists)) {
    exists.forEach((key) => {
      metadataConditions.push(
        sequelize.literal(`"Entity"."metadata" ? '${key}'`)
      );
    });
  }

  // Add the combined conditions to filter only the `metadata` property of the Entity
  if (metadataConditions.length > 0) {
    query.metadata = { [Op.and]: metadataConditions };
  }
};

const configureFollowedOnly = (
  query: any,
  followedOnly: string | undefined,
  loggedInUserId: string | undefined
) => {
  const { sequelize } = getCoreConfig();

  if (followedOnly === "true" && loggedInUserId) {
    query.userId = {
      [Op.in]: sequelize.literal(
        `(SELECT "followedId" FROM "Follows" WHERE "followerId" = '${loggedInUserId}')`
      ),
    };
  }
};

export default async (req: ExReq, res: ExRes) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "hot",
      timeFrame,
      sourceId,
      userId, // Filter posts by a specific account ID if provided
      followedOnly,
      keywordsFilters,
      metadataFilters,
      titleFilters,
      contentFilters,
      attachmentsFilters,
      locationFilters,
    } = req.query;

    const projectId = req.project.id;
    const loggedInUserId = req.userId; // User making the request (may be undefined)

    // Convert 'limit' and 'page' to numbers and validate them.
    let limitAsNumber = Number(limit);
    if (isNaN(limitAsNumber) || limitAsNumber <= 0) {
      res.status(400).json({
        error: "Invalid request: limit must be a positive number.",
        code: "entity/invalid-limit",
      });
      return;
    }
    limitAsNumber = Math.min(limitAsNumber, 100); // Maximum of 100 entities could be fetched a once

    const pageAsNumber = Number(page);
    if (isNaN(pageAsNumber) || pageAsNumber < 1 || pageAsNumber % 1 !== 0) {
      res.status(400).json({
        error: "Invalid request: page must be a whole number greater than 0.",
        code: "entity/invalid-page",
      });
      return;
    }
    if (pageAsNumber < 1 || pageAsNumber % 1 !== 0) {
      throw new Error(
        "Invalid request: 'page' must be a whole number greater than 0"
      );
    }

    // Define the sort filter based on 'sort_by' query parameter.
    const sort = configureSort(sortBy as string);

    // Set up the query filters
    const query: any = { projectId };

    configureTimeframe(query, timeFrame as string | undefined);
    configureSourceId(query, sourceId as string | undefined);
    configureUserId(query, userId as string | undefined);
    configureKeywords(query, keywordsFilters as KeywordsFilters | undefined);
    configureMetadata(query, metadataFilters as MetadataFilters | undefined);
    configureTitle(query, titleFilters as TitleFilters | undefined);
    configureContent(query, contentFilters as ContentFilters | undefined);
    configureAttachments(
      query,
      attachmentsFilters as AttachmentsFilters | undefined
    );
    configureLocation(query, locationFilters as undefined);
    configureFollowedOnly(query, followedOnly as string, loggedInUserId);


    // Perform the query on the Entity model with pagination, sorting, and filtering
    const entities = (await Entity.findAll({
      where: query,
      order: sort,
      limit: limitAsNumber,
      offset: (pageAsNumber - 1) * limitAsNumber, // Skip count for pagination
      ...entityParams,
    })) as IEntity[];

    res.status(200).json(entities.map((entity) => entity.toJSON()));

    // Schedule scoring updates asynchronously
    setImmediate(async () => {
      try {
        for (const entity of entities) {
          const entityJson: IEntityAttributes & { repliesCount: number } =
            entity.toJSON();
          const { newScore, newScoreUpdatedAt, updated } =
            scoreEntity(entityJson);

          if (updated) {
            entity.score = newScore;
            entity.scoreUpdatedAt = newScoreUpdatedAt;
            await entity.save();
          }
        }
      } catch (updateErr) {
        console.error(
          "Error updating entity scores asynchronously:",
          updateErr
        );
      }
    });
  } catch (err: any) {
    console.error("Error fetching many entities:", err);
    res.status(500).json({
      error: "Internal server error.",
      code: "entity/server-error",
      details: err.message,
    });
  }
};
