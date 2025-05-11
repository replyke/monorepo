export interface MetadataFilters {
  contains?: Record<string, unknown>; // remove after Ayapo update
  doesNotContain?: Record<string, unknown>; // remove after Ayapo update
  includes?: Record<string, unknown>;
  doesNotInclude?: Record<string, unknown>;
  exists?: string[];
  doesNotExist?: string[];
}
