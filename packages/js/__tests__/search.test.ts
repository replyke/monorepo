import { matchUsers, searchContent, searchSpaces, searchUsers } from "../src/modules/search";
import type { MatchUsersResponse } from "../src/modules/search/matchUsers";
import { makeClient } from "./helpers/client";

describe("js-sdk search — request shaping", () => {
  it("searchContent posts the body minus space-reputation fields, which go in params instead", async () => {
    const { client, projectInstance } = makeClient();
    await searchContent(client, {
      query: "hello",
      sourceTypes: ["entity"],
      spaceReputationId: "rep1",
      spaceReputationDescendants: true,
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/search/content",
      { query: "hello", sourceTypes: ["entity"] },
      { params: { spaceReputationId: "rep1", spaceReputationDescendants: true } }
    );
  });

  it("searchContent forwards spaceReputationId/Descendants as undefined params when omitted", async () => {
    const { client, projectInstance } = makeClient();
    await searchContent(client, { query: "hello" });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/search/content",
      { query: "hello" },
      { params: { spaceReputationId: undefined, spaceReputationDescendants: undefined } }
    );
  });

  it("searchUsers posts the full body to /search/users", async () => {
    const { client, projectInstance } = makeClient();
    await searchUsers(client, { query: "ali", limit: 5 });
    expect(projectInstance.post).toHaveBeenCalledWith("/search/users", {
      query: "ali",
      limit: 5,
    });
  });

  it("searchSpaces posts the full body to /search/spaces", async () => {
    const { client, projectInstance } = makeClient();
    await searchSpaces(client, { query: "design", limit: 5 });
    expect(projectInstance.post).toHaveBeenCalledWith("/search/spaces", {
      query: "design",
      limit: 5,
    });
  });

  it("matchUsers POSTs the full body to /match/users", async () => {
    const { client, projectInstance } = makeClient();
    await matchUsers(client, {
      mode: "directed",
      query: "biotech",
      limit: 10,
      spaceId: "space-1",
      includeChildSpaces: true,
      includeSampleContent: true,
      excludeSelf: false,
    });
    expect(projectInstance.post).toHaveBeenCalledWith("/match/users", {
      mode: "directed",
      query: "biotech",
      limit: 10,
      spaceId: "space-1",
      includeChildSpaces: true,
      includeSampleContent: true,
      excludeSelf: false,
    });
  });

  it("matchUsers passes a minimal passive body through unchanged", async () => {
    const { client, projectInstance } = makeClient();
    await matchUsers(client, { mode: "passive" });
    expect(projectInstance.post).toHaveBeenCalledWith("/match/users", {
      mode: "passive",
    });
  });
});

describe("js-sdk search — response mapping (raw arrays, NOT the PaginatedResponse envelope)", () => {
  it("searchContent returns the raw array of { sourceType, similarity, record } as-is", async () => {
    const { client, projectInstance } = makeClient();
    const results = [
      { sourceType: "entity", similarity: 0.92, record: { id: "e1" } },
      { sourceType: "comment", similarity: 0.81, record: { id: "c1" } },
    ];
    projectInstance.post.mockResolvedValueOnce({ data: results });

    const response = await searchContent(client, { query: "hello" });

    expect(response).toEqual(results);
    expect(Array.isArray(response)).toBe(true);
  });

  it("searchUsers returns the raw array of { similarity, record } as-is", async () => {
    const { client, projectInstance } = makeClient();
    const results = [{ similarity: 0.75, record: { id: "u1" } }];
    projectInstance.post.mockResolvedValueOnce({ data: results });

    const response = await searchUsers(client, { query: "ali" });

    expect(response).toEqual(results);
    expect(Array.isArray(response)).toBe(true);
  });

  it("searchSpaces returns the raw array of { similarity, record } as-is", async () => {
    const { client, projectInstance } = makeClient();
    const results = [{ similarity: 0.68, record: { id: "s1" } }];
    projectInstance.post.mockResolvedValueOnce({ data: results });

    const response = await searchSpaces(client, { query: "design" });

    expect(response).toEqual(results);
    expect(Array.isArray(response)).toBe(true);
  });

  it("matchUsers returns the { results } envelope (NOT a bare array) from the body", async () => {
    const { client, projectInstance } = makeClient();
    const envelope: MatchUsersResponse = {
      results: [
        {
          user: { id: "u1" } as MatchUsersResponse["results"][number]["user"],
          score: 1.5,
          matchedFacets: [
            {
              similarity: 0.7,
              askerFacet: { id: "af", hotness: 3 },
              candidateFacet: { id: "cf", hotness: 4 },
            },
          ],
        },
      ],
    };
    projectInstance.post.mockResolvedValueOnce({ data: envelope });

    const response = await matchUsers(client, { mode: "passive" });
    expect(response).toEqual(envelope);
    // A distinguishing shape check: envelope, not the bare array the other
    // search functions return.
    expect(Array.isArray(response)).toBe(false);
    expect(response.results[0].matchedFacets[0].candidateFacet.hotness).toBe(4);
  });
});
