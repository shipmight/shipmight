import { components } from "../generated/apiSchema";
import { mockDomains } from "../testUtils/mockDomains";
import { mockKubernetes } from "../testUtils/mockKubernetes";
import { nockHttp } from "../testUtils/nockHttp";
import { restoreAllMocks } from "../testUtils/restoreAllMocks";
import Projects from "./Projects";

restoreAllMocks();
nockHttp();
const kubernetes = mockKubernetes();
const Domains = mockDomains();

describe("create", () => {
  it("creates and returns project", async () => {
    kubernetes.createNamespace.mockResolvedValueOnce({});
    const mockedCreatedProject: components["schemas"]["Project"] = {
      id: "example-project-1",
      name: "Example Project",
    };
    jest.spyOn(Projects, "find").mockImplementation(async () => {
      return mockedCreatedProject;
    });

    const returnedProject = await Projects.create({
      name: "Example Project",
    });

    expect(kubernetes.createNamespace).toHaveBeenCalledTimes(1);
    expect(kubernetes.createNamespace).toHaveBeenNthCalledWith(1, {
      metadata: {
        name: expect.any(String),
        labels: {
          "app.kubernetes.io/managed-by": "shipmight",
          "project.shipmight.com/id": expect.any(String),
        },
        annotations: {
          "project.shipmight.com/name": "Example Project",
        },
      },
    });
    const projectId = kubernetes.createNamespace.mock.calls[0][0].metadata.name;
    expect(
      kubernetes.createNamespace.mock.calls[0][0].metadata.labels[
        "project.shipmight.com/id"
      ]
    ).toEqual(projectId);
    expect(Projects.find).toHaveBeenCalledTimes(1);
    expect(Projects.find).nthCalledWith(1, projectId);
    expect(returnedProject).toBe(mockedCreatedProject);
  });
});

describe("list", () => {
  it("returns empty list", async () => {
    kubernetes.listNamespaces.mockResolvedValueOnce([]);

    const projects = await Projects.list();

    expect(kubernetes.listNamespaces).toHaveBeenCalledTimes(1);
    expect(kubernetes.listNamespaces).toHaveBeenNthCalledWith(
      1,
      "project.shipmight.com/id"
    );
    expect(projects).toEqual([]);
  });

  it("returns list of projects", async () => {
    kubernetes.listNamespaces.mockResolvedValueOnce([
      {
        metadata: {
          name: "project-1",
          labels: {
            "project.shipmight.com/id": "project-1",
          },
          annotations: {
            "project.shipmight.com/name": "Project 1",
          },
        },
      },
    ]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([]);

    const projects = await Projects.list();

    expect(kubernetes.listNamespaces).toHaveBeenCalledTimes(1);
    expect(kubernetes.listNamespaces).toHaveBeenNthCalledWith(
      1,
      "project.shipmight.com/id"
    );
    expect(projects).toEqual([
      {
        id: "project-1",
        name: "Project 1",
      },
    ]);
  });

  it("sorts projects by name", async () => {
    const items = [
      { id: "project-1", name: "Project 1" },
      { id: "project-3", name: "Project 3" },
      { id: "project-2", name: "Project 2" },
    ];
    kubernetes.listNamespaces.mockResolvedValueOnce(
      items.map(({ id, name }) => ({
        metadata: {
          name,
          labels: { "project.shipmight.com/id": id },
          annotations: { "project.shipmight.com/name": name },
        },
      }))
    );
    kubernetes.listNamespacedPods.mockResolvedValueOnce([]);

    const projects = await Projects.list();

    expect(projects).toEqual([
      { id: "project-1", name: "Project 1" },
      { id: "project-2", name: "Project 2" },
      { id: "project-3", name: "Project 3" },
    ]);
  });
});

describe("findIfExists", () => {
  it("returns undefined if project is not found", async () => {
    kubernetes.listNamespaces.mockResolvedValueOnce([]);

    const project = await Projects.findIfExists("project-1");

    expect(kubernetes.listNamespaces).toHaveBeenCalledTimes(1);
    expect(kubernetes.listNamespaces).toHaveBeenNthCalledWith(
      1,
      "project.shipmight.com/id=project-1"
    );
    expect(project).toBeUndefined();
  });

  it("returns project", async () => {
    kubernetes.listNamespaces.mockResolvedValueOnce([
      {
        metadata: {
          name: "project-1",
          labels: {
            "project.shipmight.com/id": "project-1",
          },
          annotations: {
            "project.shipmight.com/name": "Project 1",
          },
        },
      },
    ]);
    kubernetes.listNamespacedPods.mockResolvedValueOnce([]);

    const project = await Projects.findIfExists("project-1");

    expect(kubernetes.listNamespaces).toHaveBeenCalledTimes(1);
    expect(kubernetes.listNamespaces).toHaveBeenNthCalledWith(
      1,
      "project.shipmight.com/id=project-1"
    );
    expect(project).toEqual({
      id: "project-1",
      name: "Project 1",
    });
  });
});

describe("find", () => {
  it("throws if project is not found", async () => {
    jest.spyOn(Projects, "findIfExists").mockImplementation(async () => {
      return undefined;
    });

    await expect(async () => {
      await Projects.find("project-1");
    }).rejects.toThrow(/project project-1 not found/);
    expect(Projects.findIfExists).toHaveBeenCalledTimes(1);
    expect(Projects.findIfExists).nthCalledWith(1, "project-1");
  });

  it("returns project", async () => {
    const mockedProject: components["schemas"]["Project"] = {
      id: "example-project-1",
      name: "Example Project",
    };
    jest.spyOn(Projects, "findIfExists").mockImplementation(async () => {
      return mockedProject;
    });

    const project = await Projects.find("project-1");

    expect(Projects.findIfExists).toHaveBeenCalledTimes(1);
    expect(Projects.findIfExists).nthCalledWith(1, "project-1");
    expect(project).toEqual({
      id: "example-project-1",
      name: "Example Project",
    });
  });
});

describe("getGroupedPerLinkedMasterDomainHostname", () => {
  it("returns empty object", async () => {
    Domains.listFromAllProjects.mockResolvedValueOnce([]);
    jest.spyOn(Projects, "list").mockImplementation(async () => {
      return [];
    });

    const grouped = await Projects.getGroupedPerLinkedMasterDomainHostname();

    expect(Projects.list).toHaveBeenCalledTimes(1);
    expect(Domains.listFromAllProjects).toHaveBeenCalledTimes(1);
    expect(grouped).toEqual({});
  });

  it("returns grouped projects", async () => {
    Domains.listFromAllProjects.mockResolvedValueOnce([
      {
        id: "example1com",
        projectId: "project-1",
        hostname: "example1.com",
        path: "/",
        appId: undefined,
        appServiceTargetId: undefined,
        targetPort: 80,
      },
      {
        id: "example2com",
        projectId: "project-2",
        hostname: "example2.com",
        path: "/",
        appId: undefined,
        appServiceTargetId: undefined,
        targetPort: 80,
      },
    ]);
    jest.spyOn(Projects, "list").mockImplementation(async () => {
      return [
        { id: "project-1", name: "Project 1" },
        { id: "project-2", name: "Project 2" },
      ];
    });

    const grouped = await Projects.getGroupedPerLinkedMasterDomainHostname();

    expect(Projects.list).toHaveBeenCalledTimes(1);
    expect(Domains.listFromAllProjects).toHaveBeenCalledTimes(1);
    expect(grouped).toEqual({
      "example1.com": [{ id: "project-1", name: "Project 1" }],
      "example2.com": [{ id: "project-2", name: "Project 2" }],
    });
  });

  it("does not return duplicate projects in the arrays", async () => {
    Domains.listFromAllProjects.mockResolvedValueOnce([
      {
        id: "domain-1",
        projectId: "project-1",
        hostname: "commonhostname.com",
        path: "/",
        appId: undefined,
        appServiceTargetId: undefined,
        targetPort: 80,
      },
      {
        id: "domain-2",
        projectId: "project-1",
        hostname: "commonhostname.com",
        path: "/",
        appId: undefined,
        appServiceTargetId: undefined,
        targetPort: 80,
      },
    ]);
    jest.spyOn(Projects, "list").mockImplementation(async () => {
      return [{ id: "project-1", name: "Project 1" }];
    });

    const grouped = await Projects.getGroupedPerLinkedMasterDomainHostname();

    expect(Projects.list).toHaveBeenCalledTimes(1);
    expect(Domains.listFromAllProjects).toHaveBeenCalledTimes(1);
    expect(grouped).toEqual({
      "commonhostname.com": [{ id: "project-1", name: "Project 1" }],
    });
  });
});
