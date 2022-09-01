import { Router } from "express";
import PromiseRouter from "express-promise-router";
import { getLogger } from "../../utils/logging";
import { readLocalsRequestId } from "../locals";
import DeployHooks from "../models/DeployHooks";
import Releases from "../models/Releases";
import NotFoundError from "../NotFoundError";
import { ApiPostRequestPayload, ApiPostRequestResponse } from "../requests";

const log = getLogger("api:requestHandlers:deployHookCallbackRouter");

const deployHookCallbackRouter = (): Router => {
  const router = PromiseRouter();

  // At some point deploy hooks will be deprecated and replaced with
  // RBAC-based API keys with access to POST /v2/apps/{appId}/deployments
  router.post<
    undefined,
    ApiPostRequestResponse<"/v1/dh", 201>,
    ApiPostRequestPayload<"/v1/dh">
  >("/v1/dh", async (req, res, next) => {
    const deployHookToken = req.header("x-deploy-hook-token")
      ? req.header("x-deploy-hook-token").toString()
      : "";
    const requestId = readLocalsRequestId(res);
    const deployHook = await DeployHooks.authenticateDeployHook(
      deployHookToken
    );
    if (!deployHook) {
      throw new NotFoundError("invalid deploy hook token");
    }
    log.info({
      message: "request authenticated via deploy hook",
      deployHookId: deployHook.id,
      projectId: deployHook.projectId,
      appId: deployHook.appId,
      requestId,
    });
    await Releases.create(
      {
        appId: deployHook.appId,
        values: req.body,
      },
      requestId
    );
    res.status(201).json({});
  });

  return router;
};

export default deployHookCallbackRouter;
