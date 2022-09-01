import { Router } from "express";
import PromiseRouter from "express-promise-router";
import { paths } from "../generated/apiSchema";
import { readLocalsMasterDomain, setLocalsMasterDomain } from "../locals";
import MasterDomains from "../models/MasterDomains";
import Projects from "../models/Projects";
import NotFoundError from "../NotFoundError";
import { ApiDeleteRequestResponse, ApiGetRequestResponse } from "../requests";

const masterDomainsRouter = (): Router => {
  const router = PromiseRouter();

  router.get<undefined, ApiGetRequestResponse<"/v1/master-domains", 200>>(
    "/v1/master-domains",
    async (req, res, next) => {
      const masterDomains = await MasterDomains.list();
      res.status(200).json(masterDomains);
    }
  );

  router.use<
    paths["/v1/master-domains/{masterDomainHostname}"]["parameters"]["path"]
  >("/v1/master-domains/:masterDomainHostname", async (req, res, next) => {
    const { masterDomainHostname } = req.params;
    const masterDomain = await MasterDomains.findIfExists(masterDomainHostname);
    if (!masterDomain) {
      throw new NotFoundError(`masterDomain ${masterDomainHostname} not found`);
    }
    setLocalsMasterDomain(res, masterDomain);
    next();
  });

  router.delete<
    undefined,
    ApiDeleteRequestResponse<"/v1/master-domains/{masterDomainHostname}", 204>
  >("/v1/master-domains/:masterDomainHostname", async (req, res, next) => {
    const masterDomain = readLocalsMasterDomain(res);
    await MasterDomains.delete(masterDomain.hostname);
    res.status(204).json();
  });

  router.get<
    undefined,
    ApiGetRequestResponse<"/v1/master-domains-in-projects", 200>
  >("/v1/master-domains-in-projects", async (req, res, next) => {
    const grouped = await Projects.getGroupedPerLinkedMasterDomainHostname();
    res.status(200).json(grouped);
  });

  return router;
};

export default masterDomainsRouter;
