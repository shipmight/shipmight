import { Router } from "express";
import PromiseRouter from "express-promise-router";
import { kubeReadyz } from "../../utils/kubernetes";
import { getLogger } from "../../utils/logging";
import { readLocalsRequestId } from "../locals";
import { ApiGetRequestResponse } from "../requests";

const log = getLogger("api:requestHandlers:healthRouter");

const healthRouter = (): Router => {
  const router = PromiseRouter();

  router.get<
    undefined,
    | ApiGetRequestResponse<"/v1/readyz", 200>
    | ApiGetRequestResponse<"/v1/readyz", 503>
  >("/v1/readyz", async (req, res, next) => {
    const requestId = readLocalsRequestId(res);
    const checks: (string | undefined)[] = await Promise.all([
      kubeReadyz()
        .then(() => {
          return undefined;
        })
        .catch((error) => {
          log.error({
            message:
              "request to kubernetes API /readyz failed or could not be initialized",
            error,
            requestId,
          });
          return "kubernetesApi";
        }),
    ]);
    const unhealthy = checks.filter((item) => item !== undefined);
    if (unhealthy.length) {
      res.status(503).json({ unhealthy });
    } else {
      res.status(200).json({});
    }
  });

  return router;
};

export default healthRouter;
