import { useCallback, useEffect, useRef, useState } from "react";

import useEntityVotes from "./useEntityVotes";
import useFetchEntity from "./useFetchEntity";
import useFetchEntityByForeignId from "./useFetchEntityByForeignId";
import useFetchEntityByShortId from "./useFetchEntityByShortId";
import useUpdateEntity, { UpdateEntityProps } from "./useUpdateEntity";
import useDeleteEntity from "./useDeleteEntity";
import { Entity } from "../../interfaces/models/Entity";
import { handleError } from "../../utils/handleError";
import useIncrementEntityViews from "./useIncrementEntityViews";
import useUser from "../users/useUser";

export interface UseEntityDataProps {
  entity?: Entity;
  entityId?: string | undefined | null;
  foreignId?: string | undefined | null;
  shortId?: string | undefined | null;
  createIfNotFound?: boolean;
}
export interface UseEntityDataValues {
  entity: Entity | null | undefined;
  setEntity: React.Dispatch<React.SetStateAction<Entity | null | undefined>>;
  userUpvotedEntity: boolean;
  userDownvotedEntity: boolean;
  upvoteEntity: () => void;
  removeEntityUpvote: () => void;
  downvoteEntity: () => void;
  removeEntityDownvote: () => void;
  updateEntity(
    props: Pick<UpdateEntityProps, "update">
  ): Promise<Entity | undefined>;
  incrementEntityViews: () => Promise<void>;
  deleteEntity: () => Promise<void>;
}

function useEntityData({
  entityId,
  foreignId,
  shortId,
  entity: entityProp,
  createIfNotFound,
}: UseEntityDataProps): UseEntityDataValues {
  const { user } = useUser();
  const [entity, setEntity] = useState<Entity | undefined | null>(entityProp);

  const entityViewsIncremented = useRef<boolean>(false);

  // Cache to store fetched entities keyed by unique identifier
  const entityCache = useRef<Record<string, Entity>>({});

  const userUpvotedEntity = !!(
    entity?.upvotes &&
    user?.id &&
    entity.upvotes.includes(user.id)
  );

  const userDownvotedEntity = !!(
    entity?.downvotes &&
    user?.id &&
    entity.downvotes.includes(user.id)
  );

  const fetchEntity = useFetchEntity();
  const fetchEntityByForeignId = useFetchEntityByForeignId();
  const fetchEntityByShortId = useFetchEntityByShortId();

  const {
    upvoteEntity,
    removeEntityUpvote,
    downvoteEntity,
    removeEntityDownvote,
  } = useEntityVotes({
    entity,
    setEntity,
  });

  const updateEntity = useUpdateEntity();
  const incrementEntityViews = useIncrementEntityViews();

  const deleteEntity = useDeleteEntity();

  const handleUpdateEntity = useCallback(
    async ({ update }: Pick<UpdateEntityProps, "update">) => {
      if (!entity) return;
      try {
        const newEntity = await updateEntity({
          entityId: entity.id,
          update,
        });
        if (newEntity) setEntity(newEntity);
        return newEntity;
      } catch (err) {
        handleError(err, "Failed to update entity");
      }
    },
    [entity, updateEntity]
  );

  const handleIncrementEntityViews = useCallback(async () => {
    if (!entity || entityViewsIncremented.current) return;
    try {
      await incrementEntityViews({ entityId: entity.id });
      entityViewsIncremented.current = true;
    } catch (err) {
      handleError(err, "Failed to increment entity views");
    }
  }, [entity, incrementEntityViews, entityViewsIncremented]);

  const handleDeleteEntity = useCallback(async () => {
    if (!entity) return;

    try {
      await deleteEntity({ entityId: entity.id });
      setEntity(undefined);
    } catch (err) {
      handleError(err, "Failed to delete entity");
    }
  }, [entity, deleteEntity]);

  useEffect(() => {
    const handleFetchEntity = async () => {
      if (!foreignId && !entityId && !shortId) return;

      if (entity && entityId && entity.id === entityId) return;
      if (entity && foreignId && entity.foreignId === foreignId) return;
      if (entity && shortId && entity.shortId === shortId) return;

      const uniqueKey = `${entityId ?? ""}-${foreignId ?? ""}-${shortId ?? ""}`;

      // If we have a cached entity, update the state and exit.
      if (entityCache.current[uniqueKey]) {
        setEntity(entityCache.current[uniqueKey]);
        return;
      }

      try {
        let fetchedEntity: Entity | null = null;

        if (entityId) {
          fetchedEntity = await fetchEntity({
            entityId,
          });
        } else if (foreignId) {
          fetchedEntity = await fetchEntityByForeignId({
            foreignId,
            createIfNotFound,
          });
        } else if (shortId) {
          fetchedEntity = await fetchEntityByShortId({
            shortId,
          });
        }

        if (fetchedEntity) {
          // Store the fetched entity in cache.
          entityCache.current[uniqueKey] = fetchedEntity;
          setEntity(fetchedEntity);
        } else {
          setEntity(null);
        }
      } catch (err) {
        handleError(err, "Failed to fetch entity");
      }
    };

    handleFetchEntity();
  }, [
    fetchEntity,
    fetchEntityByForeignId,
    fetchEntityByShortId,
    entityId,
    foreignId,
    shortId,
    entity,
    createIfNotFound,
  ]);

  useEffect(() => {
    if (entityProp) setEntity(entityProp);
  }, [entityProp]);

  return {
    entity,
    setEntity,
    userUpvotedEntity,
    userDownvotedEntity,
    upvoteEntity,
    removeEntityUpvote,
    downvoteEntity,
    removeEntityDownvote,
    updateEntity: handleUpdateEntity,
    incrementEntityViews: handleIncrementEntityViews,
    deleteEntity: handleDeleteEntity,
  };
}

export default useEntityData;
