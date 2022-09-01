import { mockKubernetes } from "../testUtils/mockKubernetes";
import { mockProjects } from "../testUtils/mockProjects";
import { nockHttp } from "../testUtils/nockHttp";
import { restoreAllMocks } from "../testUtils/restoreAllMocks";
import MasterDomains from "./MasterDomains";

restoreAllMocks();
nockHttp();
const kubernetes = mockKubernetes();
const Projects = mockProjects();

describe("list", () => {
  it("returns empty list", async () => {
    kubernetes.listIngresses.mockResolvedValueOnce([]);
    kubernetes.listNamespacedCertificates.mockResolvedValueOnce([]);

    const masterDomains = await MasterDomains.list();

    expect(kubernetes.listIngresses).toHaveBeenCalledTimes(1);
    expect(kubernetes.listIngresses).toHaveBeenNthCalledWith(
      1,
      "master-domain.shipmight.com/hostname"
    );
    expect(kubernetes.listNamespacedCertificates).toHaveBeenCalledTimes(1);
    expect(kubernetes.listNamespacedCertificates).toHaveBeenNthCalledWith(
      1,
      "shipmight",
      ""
    );
    expect(masterDomains).toEqual([]);
  });

  it("returns list of master domains", async () => {
    kubernetes.listIngresses.mockResolvedValueOnce([
      {
        metadata: {
          name: "1-examplecom-1",
          labels: {
            "master-domain.shipmight.com/hostname": "1-example.com",
          },
          annotations: {},
        },
        spec: {},
      },
      {
        metadata: {
          name: "2-justcreatedtlscom-1",
          labels: {
            "master-domain.shipmight.com/hostname": "2-justcreatedtls.com",
          },
          annotations: {
            "cert-manager.io/cluster-issuer": "self-signed",
          },
        },
        spec: {
          tls: [
            {
              hosts: ["2-justcreatedtls.com"],
              secretName: "2-justcreatedtls.com-tls",
            },
          ],
        },
      },
      {
        metadata: {
          name: "3-certnotreadycom-1",
          labels: {
            "master-domain.shipmight.com/hostname": "3-certnotready.com",
          },
          annotations: {
            "cert-manager.io/cluster-issuer": "self-signed",
          },
        },
        spec: {
          tls: [
            {
              hosts: ["3-certnotready.com"],
              secretName: "3-certnotready.com-tls",
            },
          ],
        },
      },
      {
        metadata: {
          name: "4-securecom-1",
          labels: {
            "master-domain.shipmight.com/hostname": "4-secure.com",
          },
          annotations: {
            "cert-manager.io/cluster-issuer": "self-signed",
          },
        },
        spec: {
          tls: [
            {
              hosts: ["4-secure.com"],
              secretName: "4-secure.com-tls",
            },
          ],
        },
      },
    ]);
    kubernetes.listNamespacedCertificates.mockResolvedValueOnce([
      {
        metadata: {
          name: "3-certnotready.com-tls",
        },
        status: {
          conditions: [],
        },
      },
      {
        metadata: {
          name: "4-secure.com-tls",
        },
        status: {
          conditions: [
            {
              status: "True",
              type: "Ready",
            },
          ],
        },
      },
    ]);

    const masterDomains = await MasterDomains.list();

    expect(kubernetes.listIngresses).toHaveBeenCalledTimes(1);
    expect(kubernetes.listIngresses).toHaveBeenNthCalledWith(
      1,
      "master-domain.shipmight.com/hostname"
    );
    expect(kubernetes.listNamespacedCertificates).toHaveBeenCalledTimes(1);
    expect(kubernetes.listNamespacedCertificates).toHaveBeenNthCalledWith(
      1,
      "shipmight",
      ""
    );
    expect(masterDomains).toEqual([
      {
        hostname: "1-example.com",
        tlsCertificateStatus: "NONE",
        certManagerClusterIssuer: undefined,
      },
      {
        hostname: "2-justcreatedtls.com",
        tlsCertificateStatus: "UPDATING",
        certManagerClusterIssuer: "self-signed",
      },
      {
        hostname: "3-certnotready.com",
        tlsCertificateStatus: "UPDATING",
        certManagerClusterIssuer: "self-signed",
      },
      {
        hostname: "4-secure.com",
        tlsCertificateStatus: "READY",
        certManagerClusterIssuer: "self-signed",
      },
    ]);
  });
});

describe("create", () => {
  it("creates master domain", async () => {
    kubernetes.createIngress.mockResolvedValueOnce({});

    await MasterDomains.create({ hostname: "example.com" });

    expect(kubernetes.createIngress).toHaveBeenCalledTimes(1);
    expect(kubernetes.createIngress).toHaveBeenNthCalledWith(1, "shipmight", {
      metadata: {
        namespace: "shipmight",
        name: "example.com",
        labels: {
          "app.kubernetes.io/managed-by": "shipmight",
          "master-domain.shipmight.com/hostname": "example.com",
        },
        annotations: {
          "kubernetes.io/ingress.class": "nginx",
          "nginx.org/mergeable-ingress-type": "master",
        },
      },
      spec: {
        rules: [{ host: "example.com" }],
        tls: [],
      },
    });
  });

  it("creates master domain with tls", async () => {
    kubernetes.createIngress.mockResolvedValueOnce({});

    await MasterDomains.create({
      hostname: "example.com",
      certManagerClusterIssuer: "self-signed",
    });

    expect(kubernetes.createIngress).toHaveBeenCalledTimes(1);
    expect(kubernetes.createIngress).toHaveBeenNthCalledWith(1, "shipmight", {
      metadata: {
        namespace: "shipmight",
        name: "example.com",
        labels: {
          "app.kubernetes.io/managed-by": "shipmight",
          "master-domain.shipmight.com/hostname": "example.com",
        },
        annotations: {
          "kubernetes.io/ingress.class": "nginx",
          "nginx.org/mergeable-ingress-type": "master",
          "cert-manager.io/cluster-issuer": "self-signed",
        },
      },
      spec: {
        rules: [{ host: "example.com" }],
        tls: [
          {
            hosts: ["example.com"],
            secretName: "example.com-tls",
          },
        ],
      },
    });
  });
});

describe("delete", () => {
  it("throws is master domain is not found", async () => {
    jest.spyOn(MasterDomains, "find").mockImplementation(async () => {
      throw new Error("mocked not found error from find");
    });
    Projects.getGroupedPerLinkedMasterDomainHostname.mockResolvedValueOnce({});
    kubernetes.deleteIngress.mockResolvedValueOnce();

    await expect(async () => {
      await MasterDomains.delete("example.com");
    }).rejects.toThrow(/mocked not found error from find/);

    expect(MasterDomains.find).toHaveBeenCalledTimes(1);
    expect(MasterDomains.find).nthCalledWith(1, "example.com");
    expect(
      Projects.getGroupedPerLinkedMasterDomainHostname
    ).toHaveBeenCalledTimes(0);
    expect(kubernetes.deleteIngress).toHaveBeenCalledTimes(0);
  });

  it("deletes master domain", async () => {
    jest.spyOn(MasterDomains, "find").mockImplementation(async () => {
      return { hostname: "example.com", tlsCertificateStatus: "NONE" };
    });
    Projects.getGroupedPerLinkedMasterDomainHostname.mockResolvedValueOnce({});
    kubernetes.deleteIngress.mockResolvedValueOnce();

    await MasterDomains.delete("example.com");

    expect(MasterDomains.find).toHaveBeenCalledTimes(1);
    expect(MasterDomains.find).nthCalledWith(1, "example.com");
    expect(
      Projects.getGroupedPerLinkedMasterDomainHostname
    ).toHaveBeenCalledTimes(1);
    expect(kubernetes.deleteIngress).toHaveBeenCalledTimes(1);
    expect(kubernetes.deleteIngress).toHaveBeenNthCalledWith(
      1,
      "shipmight",
      "example.com"
    );
  });

  it("throws is domain is used in any projects", async () => {
    jest.spyOn(MasterDomains, "find").mockImplementation(async () => {
      return { hostname: "example.com", tlsCertificateStatus: "NONE" };
    });
    Projects.getGroupedPerLinkedMasterDomainHostname.mockResolvedValueOnce({
      "example.com": [{ id: "project-1", name: "Project 1" }],
    });
    kubernetes.deleteIngress.mockResolvedValueOnce();

    await expect(async () => {
      await MasterDomains.delete("example.com");
    }).rejects.toThrow(
      /master domain is used in one or more projects, cannot delete/
    );

    expect(MasterDomains.find).toHaveBeenCalledTimes(1);
    expect(MasterDomains.find).nthCalledWith(1, "example.com");
    expect(
      Projects.getGroupedPerLinkedMasterDomainHostname
    ).toHaveBeenCalledTimes(1);
    expect(kubernetes.deleteIngress).toHaveBeenCalledTimes(0);
  });
});
