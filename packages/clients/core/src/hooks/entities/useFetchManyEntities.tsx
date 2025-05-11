import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { EntityListSortByOptions } from "../../interfaces/EntityListSortByOptions";
import { Entity } from "../../interfaces/models/Entity";
import { LocationFilters } from "../../interfaces/entity-filters/LocationFilters";
import { TimeFrame } from "../../interfaces/TimeFrame";
import useProject from "../projects/useProject";
import { MetadataFilters } from "../../interfaces/entity-filters/MetadataFilters";
import { TitleFilters } from "../../interfaces/entity-filters/TitleFilters";
import { ContentFilters } from "../../interfaces/entity-filters/ContentFilters";
import { AttachmentsFilters } from "../../interfaces/entity-filters/AttachmentsFilters";
import { KeywordsFilters } from "../../interfaces/entity-filters/KeywordsFilters";

function useFetchManyEntities() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const fetchManyEntities = useCallback(
    async (props: {
      page: number;
      limit: number;
      sortBy: EntityListSortByOptions | null;
      timeFrame: TimeFrame | null;
      sourceId: string | null;
      userId: string | null;
      followedOnly: boolean;
      keywordsFilters: KeywordsFilters | null;
      locationFilters: LocationFilters | null;
      metadataFilters: MetadataFilters | null;
      titleFilters: TitleFilters | null;
      contentFilters: ContentFilters | null;
      attachmentsFilters: AttachmentsFilters | null;
    }) => {
      const {
        page,
        limit,
        sortBy,
        timeFrame,
        sourceId,
        userId,
        followedOnly,
        keywordsFilters,
        metadataFilters,
        titleFilters,
        contentFilters,
        attachmentsFilters,
        locationFilters,
      } = props;

      if (!projectId) {
        throw new Error("No projectId available.");
      }

      if (page === 0 || limit === 0 || !sortBy) {
        throw new Error(
          "Invalid params passed to function:" + { page, limit, sortBy }
        );
      }

      const response = await axios.get(`/${projectId}/entities`, {
        params: {
          page,
          limit,
          followedOnly,
          userId,
          sourceId,
          sortBy,
          timeFrame,
          keywordsFilters,
          metadataFilters,
          titleFilters,
          contentFilters,
          attachmentsFilters,
          locationFilters,
        },
        withCredentials: true,
      });

      return response.data as Entity[];
    },
    [projectId, axios]
  );

  return fetchManyEntities;
}

export default useFetchManyEntities;
