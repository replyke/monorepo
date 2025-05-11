import { useCallback, useEffect, useRef, useState } from "react";
import _ from "lodash";

import { Entity } from "../../interfaces/models/Entity";
import { handleError } from "../../utils/handleError";

// export type InfusedEntity = Entity & Record<string, any>;

const useInfusedData = ({
  entities,
  infuseData,
}: {
  entities: Entity[];
  infuseData?: (foreignId: string) => Promise<Record<string, any> | null>;
}) => {
  const [infusedEntities, setInfusedEntities] = useState<
    (Entity & { infusion: Record<string, any> })[]
  >([]);
  const detailsCache = useRef<Record<string, Record<string, any>>>({});

  // Cache the previous entities to detect actual changes
  const previousEntities = useRef<Entity[]>([]);

  const infuseEntities = useCallback(
    async (entities: Entity[]) => {
      if (!infuseData) return;
      try {
        const newCombinedData: (Entity & { infusion: Record<string, any> })[] =
          await Promise.all(
            entities.map(async (entity) => {
              if (!entity.foreignId) return { ...entity, infusion: {} };
              // Check if we already have the post_details cached
              if (detailsCache.current[entity.foreignId]) {
                const cachedDetails = detailsCache.current[entity.foreignId];
                return { ...entity, infusion: { ...cachedDetails } };
              }

              try {
                const details: Record<string, any> | null = await infuseData(
                  entity.foreignId
                );

                if (!details) return { ...entity, infusion: {} };

                // Update the cache
                detailsCache.current[entity.foreignId] = details;

                return { ...entity, infusion: { ...details } } as Entity & {
                  infusion: Record<string, any>;
                };
              } catch (err) {
                // Handle data fetch errors
                console.error("Data fetch error:", err);
                // Re-throw other errors to be handled by the outer catch
                throw err;
              }
            })
          );
        setInfusedEntities(newCombinedData);
      } catch (err) {
        handleError(err, "Failed to infuse entity details: ");
      }
    },
    [infuseData]
  );

  // When entities change, fetch details for new entities
  useEffect(() => {
    if (!entities.length) return;

    if (!_.isEqual(previousEntities.current, entities)) {
      previousEntities.current = entities;
      infuseEntities(entities);
    }
  }, [entities, infuseEntities]);

  return infusedEntities;
};

export default useInfusedData;
