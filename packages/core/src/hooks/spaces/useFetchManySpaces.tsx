import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { Space, SpaceIncludeParam } from "../../interfaces/models/Space";
import { PaginatedResponse } from "../../interfaces/PaginatedResponse";
import { SpaceListSortByOptions } from "../../interfaces/SpaceListSortByOptions";
import { NsfwFilter } from "../../interfaces/NsfwFilter";

export interface FetchManySpacesProps {
  page?: number;
  limit?: number;
  sortBy?: SpaceListSortByOptions;
  searchSlug?: string | null;
  searchName?: string | null;
  searchDescription?: string | null;
  searchAny?: string | null;
  memberOf?: boolean;
  parentSpaceId?: string | null;
  nsfwFilter?: NsfwFilter | null;
  include?: SpaceIncludeParam;
}

function useFetchManySpaces(): (params?: FetchManySpacesProps) => Promise<PaginatedResponse<Space>> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchManySpaces = useCallback(
    async (params?: FetchManySpacesProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const queryParams: Record<string, any> = {};

      if (params?.page !== undefined) queryParams.page = params.page;
      if (params?.limit !== undefined) queryParams.limit = params.limit;
      if (params?.sortBy) queryParams.sortBy = params.sortBy;
      if (params?.searchSlug) queryParams.searchSlug = params.searchSlug;
      if (params?.searchName) queryParams.searchName = params.searchName;
      if (params?.searchDescription) queryParams.searchDescription = params.searchDescription;
      if (params?.searchAny) queryParams.searchAny = params.searchAny;
      // memberOf is an opt-in flag: the server only accepts the literal "true".
      // Sending "false" (the default) fails validation with a 400. Use a strict
      // === true check so a stray non-boolean (no runtime type enforcement) can't
      // be coerced into wrongly opting in.
      if (params?.memberOf === true) queryParams.memberOf = true;
      if (params?.parentSpaceId !== undefined) queryParams.parentSpaceId = params.parentSpaceId || "null";
      if (params?.nsfwFilter) queryParams.nsfwFilter = params.nsfwFilter;
      if (params?.include) {
        queryParams.include = Array.isArray(params.include)
          ? params.include.join(",")
          : params.include;
      }

      const response = await axios.get<PaginatedResponse<Space>>(
        `/${projectId}/spaces`,
        {
          params: queryParams,
        }
      );

      return response.data;
    },
    [projectId, axios]
  );

  return fetchManySpaces;
}

export default useFetchManySpaces;
