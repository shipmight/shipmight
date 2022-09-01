import supertest from "supertest";
import { mockMasterDomains } from "../testUtils/mockMasterDomains";
import { mockProjects } from "../testUtils/mockProjects";
import { testableApiServer } from "../testUtils/testableApiServer";

const testable = testableApiServer();
const MasterDomains = mockMasterDomains();
const Projects = mockProjects();

describe("GET /v1/master-domains", () => {
  testable.testWithAuthToken(
    "returns empty list if nothing found",
    async (req) => {
      MasterDomains.list.mockResolvedValueOnce([]);

      const response = await req(
        supertest(testable.api).get("/v1/master-domains")
      );

      expect(MasterDomains.list).toHaveBeenCalledTimes(1);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual([]);
    }
  );

  testable.testWithAuthToken("returns list of master domains", async (req) => {
    MasterDomains.list.mockResolvedValueOnce([
      {
        hostname: "example1.com",
        tlsCertificateStatus: "NONE",
      },
      {
        hostname: "example2.com",
        certManagerClusterIssuer: "self-signed",
        tlsCertificateStatus: "READY",
      },
    ]);

    const response = await req(
      supertest(testable.api).get("/v1/master-domains")
    );

    expect(MasterDomains.list).toHaveBeenCalledTimes(1);
    expect(response.status).toEqual(200);
    expect(response.body).toEqual([
      {
        hostname: "example1.com",
        tlsCertificateStatus: "NONE",
      },
      {
        hostname: "example2.com",
        certManagerClusterIssuer: "self-signed",
        tlsCertificateStatus: "READY",
      },
    ]);
  });
});

describe("DELETE /v1/master-domains/:masterDomainHostname", () => {
  testable.testWithAuthToken("deletes master domain", async (req) => {
    MasterDomains.findIfExists.mockResolvedValueOnce({
      hostname: "example.com",
      tlsCertificateStatus: "NONE",
    });
    MasterDomains.delete.mockResolvedValueOnce();

    const response = await req(
      supertest(testable.api).delete("/v1/master-domains/example.com")
    );

    expect(MasterDomains.findIfExists).toHaveBeenCalledTimes(1);
    expect(MasterDomains.findIfExists).toHaveBeenNthCalledWith(
      1,
      "example.com"
    );
    expect(MasterDomains.delete).toHaveBeenCalledTimes(1);
    expect(MasterDomains.delete).toHaveBeenNthCalledWith(1, "example.com");
    expect(response.status).toEqual(204);
    expect(response.body).toEqual({});
  });
});

describe("GET /v1/master-domains-in-projects", () => {
  testable.testWithAuthToken(
    "returns empty object if nothing found",
    async (req) => {
      Projects.getGroupedPerLinkedMasterDomainHostname.mockResolvedValueOnce(
        {}
      );

      const response = await req(
        supertest(testable.api).get("/v1/master-domains-in-projects")
      );

      expect(
        Projects.getGroupedPerLinkedMasterDomainHostname
      ).toHaveBeenCalledTimes(1);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({});
    }
  );

  testable.testWithAuthToken(
    "returns object of projects by master domain hostname",
    async (req) => {
      Projects.getGroupedPerLinkedMasterDomainHostname.mockResolvedValueOnce({
        "example1.com": [{ id: "project-1", name: "Project 1" }],
        "example2.com": [
          { id: "project-1", name: "Project 1" },
          { id: "project-2", name: "Project 2" },
        ],
      });

      const response = await req(
        supertest(testable.api).get("/v1/master-domains-in-projects")
      );

      expect(
        Projects.getGroupedPerLinkedMasterDomainHostname
      ).toHaveBeenCalledTimes(1);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        "example1.com": [{ id: "project-1", name: "Project 1" }],
        "example2.com": [
          { id: "project-1", name: "Project 1" },
          { id: "project-2", name: "Project 2" },
        ],
      });
    }
  );
});
