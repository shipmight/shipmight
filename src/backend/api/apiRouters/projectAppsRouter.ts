import { Router } from "express";
import PromiseRouter from "express-promise-router";
import { paths } from "../generated/apiSchema";
import { readLocalsProject } from "../locals";
import Apps from "../models/Apps";
import {
  ApiGetRequestResponse,
  ApiPostRequestPayload,
  ApiPostRequestResponse,
} from "../requests";

const projectAppsRouter = (): Router => {
  const router = PromiseRouter();

  router.get<
    undefined,
    ApiGetRequestResponse<"/v1/projects/{projectId}/apps", 200>,
    unknown,
    paths["/v1/projects/{projectId}/apps"]["parameters"]["query"]
  >("/v1/projects/:projectId/apps", async (req, res, next) => {
    const project = readLocalsProject(res);
    const { appChartId } = req.query;
    const apps = await Apps.list(project.id, appChartId);
    res.status(200).json(apps);
  });

  router.post<
    undefined,
    ApiPostRequestResponse<"/v1/projects/{projectId}/apps", 201>,
    ApiPostRequestPayload<"/v1/projects/{projectId}/apps">,
    paths["/v1/projects/{projectId}/apps"]["parameters"]["query"]
  >("/v1/projects/:projectId/apps", async (req, res, next) => {
    const project = readLocalsProject(res);
    const { appChartId } = req.query;
    const app = await Apps.create({
      projectId: project.id,
      appChartId,
      values: req.body,
    });
    return res.status(201).json(app);
  });

  return router;
};

export default projectAppsRouter;
