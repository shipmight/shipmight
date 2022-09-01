import supertest from "supertest";
import { mockDeployHooks } from "../testUtils/mockDeployHooks";
import { testableApiServer } from "../testUtils/testableApiServer";

const testable = testableApiServer();
const DeployHooks = mockDeployHooks();

describe("DELETE /v1/deploy-hooks/:deployHookId", () => {
  testable.testWithAuthToken("deletes deploy hook", async (req) => {
    DeployHooks.findIfExists.mockResolvedValueOnce({
      id: "deploy-hook-1",
      projectId: "project-1",
      appId: "app-1",
      name: "Test Deploy Hook",
      lastUsedAt: null,
      createdAt: "",
    });
    DeployHooks.delete.mockResolvedValueOnce();

    const response = await req(
      supertest(testable.api).delete("/v1/deploy-hooks/deploy-hook-1")
    );

    expect(DeployHooks.findIfExists).toHaveBeenCalledTimes(1);
    expect(DeployHooks.findIfExists).toHaveBeenNthCalledWith(
      1,
      "deploy-hook-1"
    );
    expect(DeployHooks.delete).toHaveBeenCalledTimes(1);
    expect(DeployHooks.delete).toHaveBeenNthCalledWith(1, "deploy-hook-1");
    expect(response.status).toEqual(204);
    expect(response.body).toEqual({});
  });
});
