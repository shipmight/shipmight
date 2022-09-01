import { Router } from "express";
import PromiseRouter from "express-promise-router";
import { readLocalsApp } from "../locals";
import Deployments from "../models/Deployments";
import { ApiGetRequestResponse } from "../requests";

const appDeploymentsRouter = (): Router => {
  const router = PromiseRouter();

  router.get<
    undefined,
    ApiGetRequestResponse<"/v1/apps/{appId}/deployments", 200>
  >("/v1/apps/:appId/deployments", async (req, res, next) => {
    const app = readLocalsApp(res);
    const deployments = await Deployments.list(app.id);
    res.status(200).json(deployments);
  });

  return router;
};

export default appDeploymentsRouter;
