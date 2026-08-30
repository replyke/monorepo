import { askContent, matchUsers, searchContent, searchSpaces, searchUsers } from "../src/modules/search";
import type { MatchUsersResponse } from "../src/modules/search/matchUsers";
import { makeClient } from "./helpers/mockClient";

describe("node-sdk search — request shaping", () => {
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
      { params: { spaceReputationId: "rep1", spaceReputationDescendants: true } },
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

  it("askContent posts the body minus space-reputation fields, which go in params instead (plain request, no streaming)", async () => {
    const { client, projectInstance } = makeClient();
    await askContent(client, {
      query: "what is this space about?",
      spaceId: "s1",
      spaceReputationId: "rep1",
      spaceReputationDescendants: false,
    });
    expect(projectInstance.post).toHaveBeenCalledWith(
      "/search/ask",
      { query: "what is this space about?", spaceId: "s1" },
      { params: { spaceReputationId: "rep1", spaceReputationDescendants: false } },
    );
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

describe("node-sdk search — response mapping", () => {
  it("searchContent returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "e1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.post.mockResolvedValueOnce({ data: envelope });
    await expect(searchContent(client, { query: "hello" })).resolves.toEqual(envelope);
  });

  it("searchUsers returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "u1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.post.mockResolvedValueOnce({ data: envelope });
    await expect(searchUsers(client, { query: "ali" })).resolves.toEqual(envelope);
  });

  it("searchSpaces returns the full PaginatedResponse envelope", async () => {
    const { client, projectInstance } = makeClient();
    const envelope = { data: [{ id: "s1" }], pagination: { page: 1, limit: 10, total: 1 } };
    projectInstance.post.mockResolvedValueOnce({ data: envelope });
    await expect(searchSpaces(client, { query: "design" })).resolves.toEqual(envelope);
  });

  it("askContent returns response.data as a plain { answer, sources } object", async () => {
    const { client, projectInstance } = makeClient();
    const result = { answer: "It's about design.", sources: [{ entityId: "e1", title: "Intro" }] };
    projectInstance.post.mockResolvedValueOnce({ data: result });
    await expect(
      askContent(client, { query: "what is this space about?" }),
    ).resolves.toEqual(result);
  });

  it("matchUsers returns the { results } envelope from the response body", async () => {
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
    const res = await matchUsers(client, { mode: "passive" });
    expect(res).toEqual(envelope);
    expect(res.results[0].matchedFacets[0].candidateFacet.hotness).toBe(4);
  });
});
