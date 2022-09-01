import { Router } from "express";
import PromiseRouter from "express-promise-router";
import { readLocalsApp, readLocalsRequestId } from "../locals";
import Releases from "../models/Releases";
import {
  ApiGetRequestResponse,
  ApiPostRequestPayload,
  ApiPostRequestResponse,
} from "../requests";

const appReleasesRouter = (): Router => {
  const router = PromiseRouter();

  router.get<
    undefined,
    ApiGetRequestResponse<"/v1/apps/{appId}/releases", 200>
  >("/v1/apps/:appId/releases", async (req, res, next) => {
    const app = readLocalsApp(res);
    const releases = await Releases.list(app.id);
    res.status(200).json(releases);
  });

  router.post<
    undefined,
    ApiPostRequestResponse<"/v1/apps/{appId}/releases", 201>,
    ApiPostRequestPayload<"/v1/apps/{appId}/releases">
  >("/v1/apps/:appId/releases", async (req, res, next) => {
    const requestId = readLocalsRequestId(res);
    const app = readLocalsApp(res);
    await Releases.create(
      {
        appId: app.id,
        values: req.body,
      },
      requestId
    );
    res.status(201).json({});
  });

  return router;
};

export default appReleasesRouter;
