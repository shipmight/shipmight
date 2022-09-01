import { Router } from "express";
import PromiseRouter from "express-promise-router";
import { paths } from "../generated/apiSchema";
import { readLocalsApp } from "../locals";
import Runs from "../models/Runs";
import { ApiDeleteRequestResponse, ApiGetRequestResponse } from "../requests";

const appRunsRouter = (): Router => {
  const router = PromiseRouter();

  router.get<undefined, ApiGetRequestResponse<"/v1/apps/{appId}/runs", 200>>(
    "/v1/apps/:appId/runs",
    async (req, res, next) => {
      const app = readLocalsApp(res);
      const runs = await Runs.list(app.id);
      res.status(200).json(runs);
    }
  );

  router.delete<
    paths["/v1/apps/{appId}/runs/{runReleaseId}"]["parameters"]["path"],
    ApiDeleteRequestResponse<"/v1/apps/{appId}/runs/{runReleaseId}", 204>
  >("/v1/apps/:appId/runs/:runReleaseId", async (req, res, next) => {
    const { runReleaseId } = req.params;
    const app = readLocalsApp(res);
    await Runs.delete(app.projectId, runReleaseId);
    res.status(204).json({});
  });

  return router;
};

export default appRunsRouter;
