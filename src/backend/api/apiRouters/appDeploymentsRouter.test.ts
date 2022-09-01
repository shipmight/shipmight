import supertest from "supertest";
import { mockApps } from "../testUtils/mockApps";
import { mockDeployments } from "../testUtils/mockDeployments";
import { testableApiServer } from "../testUtils/testableApiServer";

const testable = testableApiServer();
const Apps = mockApps();
const Deployments = mockDeployments();

describe("GET /v1/apps/:appId/deployments", () => {
  beforeEach(() => {
    Apps.findIfExists.mockImplementation(async (appId) => {
      if (appId === "foobar-app-1") {
        return {
          id: "foobar-app-1",
          projectId: "foobar-project-1",
          appChartId: "foobar-app-chart-1",
          name: "Example app",
          values: {},
        };
      }
      return undefined;
    });
  });

  testable.testWithAuthToken(
    "returns 404 if app does not exist",
    async (req) => {
      Deployments.list.mockResolvedValueOnce([]);

      const response = await req(
        supertest(testable.api).get("/v1/apps/non-existent/deployments")
      );

      expect(Deployments.list).toHaveBeenCalledTimes(0);
      expect(response.status).toEqual(404);
    }
  );

  testable.testWithAuthToken(
    "returns empty list if nothing found",
    async (req) => {
      Deployments.list.mockResolvedValueOnce([]);

      const response = await req(
        supertest(testable.api).get("/v1/apps/foobar-app-1/deployments")
      );

      expect(Deployments.list).toHaveBeenCalledTimes(1);
      expect(Deployments.list).toHaveBeenNthCalledWith(1, "foobar-app-1");
      expect(response.status).toEqual(200);
      expect(response.body).toEqual([]);
    }
  );

  testable.testWithAuthToken("returns list of deployments", async (req) => {
    Deployments.list.mockResolvedValueOnce([
      {
        releaseId: "foobar-release-1",
        createdAt: "2022-06-01T13:32:07+03:00",
        replicas: 1,
        readyReplicas: 1,
        podStatuses: [{ status: "RUNNING" }],
      },
    ]);

    const response = await req(
      supertest(testable.api).get("/v1/apps/foobar-app-1/deployments")
    );

    expect(Deployments.list).toHaveBeenCalledTimes(1);
    expect(Deployments.list).toHaveBeenNthCalledWith(1, "foobar-app-1");
    expect(response.status).toEqual(200);
    expect(response.body).toEqual([
      {
        releaseId: "foobar-release-1",
        createdAt: "2022-06-01T13:32:07+03:00",
        replicas: 1,
        readyReplicas: 1,
        podStatuses: [{ status: "RUNNING" }],
      },
    ]);
  });
});
