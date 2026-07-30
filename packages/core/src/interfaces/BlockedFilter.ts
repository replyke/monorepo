// Block filter for content lists (entities / comments). Mirrors the server
// `blockedFilter` query param verbatim. Content authored by users the viewer is
// block-edged with is hidden by default ("exclude"). "include-outbound-blocked"
// re-includes ONLY the viewer's own outbound-blocked authors (their "view
// anyway" choice); it never surfaces content from users who blocked the viewer.
export type BlockedFilter = "exclude" | "include-outbound-blocked";
