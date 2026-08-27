export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}
