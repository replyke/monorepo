import { useEffect, useState } from "react";
import { useSublayDispatch } from "../../../store/hooks";
import { setConversation } from "../../../store/slices/chatSlice";
import { Conversation } from "../../../interfaces/models/Conversation";
import useAxiosPrivate from "../../../config/useAxiosPrivate";
import useProject from "../../projects/useProject";
import { handleError } from "../../../utils/handleError";

export interface UseFetchSpaceConversationProps {
  spaceId: string;
}

export interface UseFetchSpaceConversationValues {
  conversation: Conversation | null;
  loading: boolean;
}

function useFetchSpaceConversation({
  spaceId,
}: UseFetchSpaceConversationProps): UseFetchSpaceConversationValues {
  const dispatch = useSublayDispatch();
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const [conversation, setLocalConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId || !spaceId) return;

    const fetch = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `/${projectId}/spaces/${spaceId}/conversation`
        );
        const data = response.data as Conversation;
        dispatch(setConversation(data));
        setLocalConversation(data);
      } catch (err) {
        handleError(err, "Failed to load space conversation");
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [projectId, spaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { conversation, loading };
}

export default useFetchSpaceConversation;
