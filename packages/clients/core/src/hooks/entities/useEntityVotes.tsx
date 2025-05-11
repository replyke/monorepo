import { useCallback, useState } from "react";
import { handleError } from "../../utils/handleError";
import { Entity } from "../../interfaces/models/Entity";
import useUser from "../users/useUser";

// Import the API communication hooks
import useUpvoteEntity from "./useUpvoteEntity";
import useRemoveEntityUpvote from "./useRemoveEntityUpvote";
import useDownvoteEntity from "./useDownvoteEntity";
import useRemoveEntityDownvote from "./useRemoveEntityDownvote";

function useEntityVotes(props: {
  entity: Entity | undefined | null;
  setEntity: React.Dispatch<React.SetStateAction<Entity | undefined | null>>;
}) {
  const { user } = useUser();
  const { entity, setEntity } = props;

  const [isUpdating, setIsUpdating] = useState(false);
  const [previousEntity, setPreviousEntity] = useState<
    Entity | undefined | null
  >(entity);

  // Save the current state for potential reversion on error
  const updateEntityState = (newEntityState: Entity | undefined) => {
    setPreviousEntity(entity);
    setEntity(newEntityState);
  };

  const revertToPreviousState = useCallback(() => {
    setEntity(previousEntity);
  }, [previousEntity, setEntity]);

  // Get the API request functions from the extracted hooks
  const upvoteEntityRequest = useUpvoteEntity();
  const removeEntityUpvoteRequest = useRemoveEntityUpvote();
  const downvoteEntityRequest = useDownvoteEntity();
  const removeEntityDownvoteRequest = useRemoveEntityDownvote();

  const handleUpvote = async () => {
    if (!user) throw new Error("No authenticated user");
    if (!entity) throw new Error("No entity provided");
    if (isUpdating) return;

    // Optimistic update: add user's upvote and remove any downvote from the user
    updateEntityState({
      ...entity,
      upvotes: [...(entity.upvotes || []), user.id],
      downvotes: (entity.downvotes || []).filter((id) => id !== user.id),
    });

    setIsUpdating(true);
    try {
      const updatedEntity = await upvoteEntityRequest({
        entityId: entity.id,
      });
      setEntity(updatedEntity);
    } catch (err) {
      revertToPreviousState();
      handleError(err, "Failed to update entity vote: ");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveUpvote = async () => {
    if (!user) throw new Error("No authenticated user");
    if (!entity) throw new Error("No entity provided");
    if (isUpdating) return;

    // Optimistic update: remove user's upvote
    updateEntityState({
      ...entity,
      upvotes: (entity.upvotes || []).filter((id) => id !== user.id),
    });

    setIsUpdating(true);
    try {
      const updatedEntity = await removeEntityUpvoteRequest({
        entityId: entity.id,
      });
      setEntity(updatedEntity);
    } catch (err) {
      revertToPreviousState();
      handleError(err, "Failed to remove upvote from entity: ");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownvote = async () => {
    if (!user) throw new Error("No authenticated user");
    if (!entity) throw new Error("No entity provided");
    if (isUpdating) return;

    // Optimistic update: add user's downvote and remove any upvote from the user
    updateEntityState({
      ...entity,
      downvotes: [...(entity.downvotes || []), user.id],
      upvotes: (entity.upvotes || []).filter((id) => id !== user.id),
    });

    setIsUpdating(true);
    try {
      const updatedEntity = await downvoteEntityRequest({
        entityId: entity.id,
      });
      setEntity(updatedEntity);
    } catch (err) {
      revertToPreviousState();
      handleError(err, "Failed to update entity vote: ");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveDownvote = async () => {
    if (!user) throw new Error("No authenticated user");
    if (!entity) throw new Error("No entity provided");
    if (isUpdating) return;

    // Optimistic update: remove user's downvote
    updateEntityState({
      ...entity,
      downvotes: (entity.downvotes || []).filter((id) => id !== user.id),
    });

    setIsUpdating(true);
    try {
      const updatedEntity = await removeEntityDownvoteRequest({
        entityId: entity.id,
      });
      setEntity(updatedEntity);
    } catch (err) {
      revertToPreviousState();
      handleError(err, "Failed to remove downvote from entity: ");
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    upvoteEntity: handleUpvote,
    removeEntityUpvote: handleRemoveUpvote,
    downvoteEntity: handleDownvote,
    removeEntityDownvote: handleRemoveDownvote,
  };
}

export default useEntityVotes;
