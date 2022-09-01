import supertest from "supertest";
import { mockDeployHooks } from "../testUtils/mockDeployHooks";
import { mockReleases } from "../testUtils/mockReleases";
import { testableApiServer } from "../testUtils/testableApiServer";

const testable = testableApiServer();
const DeployHooks = mockDeployHooks();
const Releases = mockReleases();

describe("POST /v1/dh", () => {
  it("fails if token is not found", async () => {
    DeployHooks.authenticateDeployHook.mockResolvedValueOnce(undefined);

    const response = await supertest(testable.api)
      .post("/v1/dh")
      .set("x-deploy-hook-token", "token123")
      .set("content-type", "application/json")
      .send({ imageTag: "13.2.0" });

    expect(DeployHooks.authenticateDeployHook).toHaveBeenCalledTimes(1);
    expect(DeployHooks.authenticateDeployHook).toHaveBeenNthCalledWith(
      1,
      "token123"
    );
    expect(response.status).toEqual(404);
    expect(Releases.create).not.toHaveBeenCalled();
  });

  it("creates new deployment if token is valid", async () => {
    DeployHooks.authenticateDeployHook.mockResolvedValueOnce({
      id: "token-id-123",
      projectId: "project-id-123",
      appId: "app-id-123",
      name: "example token",
      lastUsedAt: null,
      createdAt: "2022-05-10T22:52:41+03:00",
    });

    const response = await supertest(testable.api)
      .post("/v1/dh")
      .set("x-deploy-hook-token", "token123")
      .set("content-type", "application/json")
      .send({ imageTag: "13.2.0" });

    expect(DeployHooks.authenticateDeployHook).toHaveBeenCalledTimes(1);
    expect(DeployHooks.authenticateDeployHook).toHaveBeenNthCalledWith(
      1,
      "token123"
    );
    expect(Releases.create).toHaveBeenCalledTimes(1);
    expect(Releases.create).toHaveBeenNthCalledWith(
      1,
      {
        appId: "app-id-123",
        values: {
          imageTag: "13.2.0",
        },
      },
      expect.any(String) // requestId
    );
    expect(response.status).toEqual(201);
    expect(response.body).toEqual({});
  });
});
