import { Router } from "express";
import PromiseRouter from "express-promise-router";
import { paths } from "../generated/apiSchema";
import { readLocalsDeployHook, setLocalsDeployHook } from "../locals";
import DeployHooks from "../models/DeployHooks";
import NotFoundError from "../NotFoundError";
import { ApiDeleteRequestResponse } from "../requests";

const deployHooksRouter = (): Router => {
  const router = PromiseRouter();

  router.use<paths["/v1/deploy-hooks/{deployHookId}"]["parameters"]["path"]>(
    "/v1/deploy-hooks/:deployHookId",
    async (req, res, next) => {
      const { deployHookId } = req.params;
      const deployHook = await DeployHooks.findIfExists(deployHookId);
      if (!deployHook) {
        throw new NotFoundError(`deploy hook ${deployHookId} not found`);
      }
      setLocalsDeployHook(res, deployHook);
      next();
    }
  );

  router.delete<
    undefined,
    ApiDeleteRequestResponse<"/v1/deploy-hooks/{deployHookId}", 204>
  >("/v1/deploy-hooks/:deployHookId", async (req, res, next) => {
    const deployHook = readLocalsDeployHook(res);
    await DeployHooks.delete(deployHook.id);
    res.status(204).json();
  });

  return router;
};

export default deployHooksRouter;
