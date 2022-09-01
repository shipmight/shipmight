import nock from "nock";
import * as certManager from "../services/certManager";
import * as kubernetes from "../../utils/kubernetes";
import * as string from "../../utils/string";
import MasterDomains from "./MasterDomains";
import Domains from "./Domains";
import Apps from "./Apps";
import AppCharts from "./AppCharts";
import { components } from "../generated/apiSchema";

beforeAll(() => {
  nock.disableNetConnect();
});

afterAll(() => {
  nock.enableNetConnect();
  jest.restoreAllMocks();
});

describe("list", () => {
  it("lists none if there are none", async () => {
    jest
      .spyOn(kubernetes, "listIngresses")
      .mockImplementationOnce(async (...args) => {
        expect(args).toEqual(["domain.shipmight.com/project-id=foo-project"]);
        return [];
      });

    expect(await Domains.list("foo-project")).toEqual([]);
  });

  it("filters by appId label if appId given", async () => {
    jest
      .spyOn(kubernetes, "listIngresses")
      .mockImplementationOnce(async (...args) => {
        expect(args).toEqual([
          "domain.shipmight.com/project-id=foo-project,domain.shipmight.com/app-id=foo-app",
        ]);
        return [];
      });

    expect(await Domains.list("foo-project", "foo-app")).toEqual([]);
  });

  it("returns list of domains", async () => {
    jest.spyOn(kubernetes, "listIngresses").mockImplementationOnce(async () => {
      return [
        {
          metadata: {
            labels: {
              "app.kubernetes.io/managed-by": "shipmight",
              "domain.shipmight.com/id": "foo-domain-1",
              "domain.shipmight.com/project-id": "foo-project",
            },
            annotations: {
              "domain.shipmight.com/hostname": "example.com",
              "domain.shipmight.com/path": "/",
              "domain.shipmight.com/app-service-target-id": "",
              "domain.shipmight.com/target-port": "8080",
            },
          },
        },
        {
          metadata: {
            labels: {
              "app.kubernetes.io/managed-by": "shipmight",
              "domain.shipmight.com/id": "foo-domain-2",
              "domain.shipmight.com/project-id": "foo-project",
              "domain.shipmight.com/app-id": "foo-app",
            },
            annotations: {
              "domain.shipmight.com/hostname": "sub.example.com",
              "domain.shipmight.com/path": "/",
              "domain.shipmight.com/app-service-target-id": "app-logs",
              "domain.shipmight.com/target-port": "8080",
            },
          },
        },
      ];
    });

    expect(await Domains.list("foo-project")).toEqual([
      {
        projectId: "foo-project",
        id: "foo-domain-1",
        hostname: "example.com",
        path: "/",
        targetPort: 8080,
        appId: undefined,
        appServiceTargetId: null,
      },
      {
        projectId: "foo-project",
        id: "foo-domain-2",
        hostname: "sub.example.com",
        path: "/",
        targetPort: 8080,
        appId: "foo-app",
        appServiceTargetId: "app-logs",
      },
    ]);
  });
});

describe("create", () => {
  const cases = [
    { name: "creates non-SSL domain without app", ssl: false, app: false },
    { name: "creates non-SSL domain with app", ssl: false, app: true },
    { name: "creates SSL domain without app", ssl: true, app: false },
    { name: "creates SSL domain with app", ssl: true, app: true },
  ] as const;

  for (const { name, ssl, app } of cases) {
    it(name, async () => {
      const createArgs = {
        hostname: "example.com",
        path: "/",
        appId: app ? "foo-app" : null,
        appServiceTargetId: app ? "foo-service-target" : null,
        targetPort: 80,
      };
      jest
        .spyOn(certManager, "getCertManagerIssuers")
        .mockImplementationOnce(async () => {
          return ssl
            ? [
                {
                  kubeName: "letsencrypt",
                  name: "letsencrypt",
                },
              ]
            : [];
        });
      if (app) {
        jest.spyOn(Apps, "find").mockImplementationOnce(async (...args) => {
          expect(args).toEqual(["foo-app"]);
          return {
            id: "foo-app",
            projectId: "foo-project",
            appChartId: "foo-app-chart",
            name: "Foo App",
            values: {},
          };
        });
        jest
          .spyOn(AppCharts, "find")
          .mockImplementationOnce(async (...args) => {
            expect(args).toEqual(["foo-app-chart"]);
            return {
              id: "foo-app-chart",
              chart: {
                internalChartName: "foo-internal-chart",
              },
              spec: {
                serviceTargets: [
                  {
                    id: "foo-service-target",
                  },
                ],
              } as components["schemas"]["AppChart"]["spec"],
              schema: {},
            };
          });
      }
      jest
        .spyOn(MasterDomains, "createIfNotExists")
        .mockImplementationOnce(async (...args) => {
          expect(args).toEqual([
            {
              certManagerClusterIssuer: ssl ? "letsencrypt" : null,
              hostname: "example.com",
            },
          ]);
        });
      jest.spyOn(string, "transformToId").mockImplementationOnce((...args) => {
        expect(args).toEqual(["example.com"]);
        return "id-1";
      });
      jest
        .spyOn(kubernetes, "createIngress")
        .mockImplementationOnce(async (...args) => {
          expect(args).toEqual([
            "foo-project",
            {
              metadata: {
                annotations: {
                  "kubernetes.io/ingress.class": "nginx",
                  "nginx.org/mergeable-ingress-type": "minion",
                  "domain.shipmight.com/app-service-target-id": app
                    ? "foo-service-target"
                    : "",
                  "domain.shipmight.com/hostname": "example.com",
                  "domain.shipmight.com/path": "/",
                  "domain.shipmight.com/target-port": "80",
                },
                labels: {
                  "app.kubernetes.io/managed-by": "shipmight",
                  "domain.shipmight.com/id": "id-1",
                  "domain.shipmight.com/project-id": "foo-project",
                  "domain.shipmight.com/app-id": app ? "foo-app" : undefined,
                },
                name: "id-1",
                namespace: "foo-project",
              },
              spec: {
                rules: [
                  {
                    host: "example.com",
                    http: app
                      ? {
                          paths: [
                            {
                              backend: {
                                service: {
                                  name: "id-1",
                                  port: { number: 80 },
                                },
                              },
                              path: "/",
                              pathType: "Prefix",
                            },
                          ],
                        }
                      : null,
                  },
                ],
              },
            },
          ]);
          return {}; // Not used
        });
      jest
        .spyOn(kubernetes, "createService")
        .mockImplementationOnce(async (...args) => {
          // TODO possible error from this assertion is not printed to the console, because
          // it's in a try-catch in the actual function. Could try to find a way to make it
          // clearer what happens if this test flow throws.
          expect(args).toEqual([
            "foo-project",
            {
              metadata: {
                namespace: "foo-project",
                name: "id-1",
                labels: {
                  "app.kubernetes.io/managed-by": "shipmight",
                  "domain.shipmight.com/id": "id-1",
                },
              },
              spec: {
                selector: app
                  ? {
                      "ext.shipmight.com/service-target.foo-service-target":
                        "foo-app",
                    }
                  : null,
                ports: [{ name: "http", protocol: "TCP", port: 80 }],
              },
            },
          ]);
          return {}; // Not used
        });
      jest.spyOn(Domains, "find").mockImplementationOnce(async (...args) => {
        expect(args).toEqual(["id-1"]);
        return {
          ...createArgs,
          id: "id-1",
          projectId: "foo-project",
        };
      });

      expect(await Domains.create("foo-project", createArgs)).toEqual({
        ...createArgs,
        id: "id-1",
        projectId: "foo-project",
      });
    });
  }

  it.skip("deletes Ingress if Service errored", async () => {
    let createServiceWasCalled = false;
    jest
      .spyOn(certManager, "getCertManagerIssuers")
      .mockImplementationOnce(async () => {
        return [];
      });
    jest
      .spyOn(MasterDomains, "createIfNotExists")
      .mockImplementationOnce(async (...args) => {
        expect(args).toEqual([
          {
            certManagerClusterIssuer: null,
            hostname: "example.com",
          },
        ]);
      });
    jest.spyOn(string, "transformToId").mockImplementationOnce((...args) => {
      expect(args).toEqual(["example.com"]);
      return "id-1";
    });
    jest.spyOn(kubernetes, "createIngress").mockImplementationOnce(async () => {
      return {}; // Not used
    });
    jest.spyOn(kubernetes, "createService").mockImplementationOnce(async () => {
      createServiceWasCalled = true;
      throw new Error("mocked error from createService");
    });

    expect(createServiceWasCalled).toEqual(true);
    expect(
      async () =>
        await Domains.create("foo-project", {
          hostname: "example.com",
          path: "/",
          appId: null,
          appServiceTargetId: null,
          targetPort: 80,
        })
    ).toThrow("asd");
  });
});
