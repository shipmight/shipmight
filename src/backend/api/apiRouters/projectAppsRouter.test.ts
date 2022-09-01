import supertest from "supertest";
import { mockProjects } from "../testUtils/mockProjects";
import { mockApps } from "../testUtils/mockApps";
import { testableApiServer } from "../testUtils/testableApiServer";

const testable = testableApiServer();
const Projects = mockProjects();
const Apps = mockApps();

describe("GET /v1/projects/:projectId/apps", () => {
  beforeEach(() => {
    Projects.findIfExists.mockImplementation(async (projectId) => {
      if (projectId === "foobar-project-1") {
        return {
          id: "foobar-project-1",
          name: "Example project",
        };
      }
      return undefined;
    });
  });

  testable.testWithAuthToken(
    "returns 404 if project does not exist",
    async (req) => {
      Apps.list.mockResolvedValueOnce([]);

      const response = await req(
        supertest(testable.api).get("/v1/projects/non-existent/apps")
      );

      expect(Apps.list).toHaveBeenCalledTimes(0);
      expect(response.status).toEqual(404);
    }
  );

  testable.testWithAuthToken(
    "returns empty list if nothing found",
    async (req) => {
      Apps.list.mockResolvedValueOnce([]);

      const response = await req(
        supertest(testable.api).get("/v1/projects/foobar-project-1/apps")
      );

      expect(Apps.list).toHaveBeenCalledTimes(1);
      expect(Apps.list).toHaveBeenNthCalledWith(
        1,
        "foobar-project-1",
        undefined
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual([]);
    }
  );

  testable.testWithAuthToken("returns list of apps", async (req) => {
    Apps.list.mockResolvedValueOnce([
      {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example app",
        values: {},
      },
    ]);

    const response = await req(
      supertest(testable.api).get("/v1/projects/foobar-project-1/apps")
    );

    expect(Apps.list).toHaveBeenCalledTimes(1);
    expect(Apps.list).toHaveBeenNthCalledWith(1, "foobar-project-1", undefined);
    expect(response.status).toEqual(200);
    expect(response.body).toEqual([
      {
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example app",
        values: {},
      },
    ]);
  });

  it.todo("limits results via appChartId");
});

describe("POST /v1/projects/:projectId/apps", () => {
  beforeEach(() => {
    Projects.findIfExists.mockImplementation(async (projectId) => {
      if (projectId === "foobar-project-1") {
        return {
          id: "foobar-project-1",
          name: "Example project",
        };
      }
      return undefined;
    });
  });

  testable.testWithAuthToken(
    "returns 404 if project does not exist",
    async (req) => {
      Apps.create.mockResolvedValueOnce({
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example app",
        values: {},
      });

      const response = await req(
        supertest(testable.api)
          .post("/v1/projects/non-existent/apps")
          .set("content-type", "application/json")
          .send({ name: "example name" })
      );

      expect(Apps.create).toHaveBeenCalledTimes(0);
      expect(response.status).toEqual(404);
    }
  );

  testable.testWithAuthToken(
    "returns 201 when app was created",
    async (req) => {
      Apps.create.mockResolvedValueOnce({
        id: "foobar-app-1",
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        name: "Example app",
        values: { name: "example name" },
      });

      const response = await req(
        supertest(testable.api)
          .post(
            "/v1/projects/foobar-project-1/apps?appChartId=foobar-app-chart-1"
          )
          .set("content-type", "application/json")
          .send({ name: "example name" })
      );

      expect(Apps.create).toHaveBeenCalledTimes(1);
      expect(Apps.create).toHaveBeenNthCalledWith(1, {
        projectId: "foobar-project-1",
        appChartId: "foobar-app-chart-1",
        values: { name: "example name" },
      });
      expect(response.status).toEqual(201);
      expect(response.body).toEqual({
        appChartId: "foobar-app-chart-1",
        id: "foobar-app-1",
        name: "Example app",
        projectId: "foobar-project-1",
        values: { name: "example name" },
      });
    }
  );

  testable.testNameValidation("validates name", async (name, req) => {
    const response = await req(
      supertest(testable.api)
        .post(
          "/v1/projects/foobar-project-1/apps?appChartId=foobar-app-chart-1"
        )
        .set("content-type", "application/json")
        .send({ name })
    );
    return response;
  });
});
