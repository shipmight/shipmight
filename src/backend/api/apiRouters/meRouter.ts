import { Router } from "express";
import PromiseRouter from "express-promise-router";
import { signBearerToken, writeBearerTokenCookie } from "../jwt";
import { readLocalsMe } from "../locals";
import Users from "../models/Users";
import {
  ApiGetRequestResponse,
  ApiPostRequestPayload,
  ApiPostRequestResponse,
} from "../requests";

const meRouter = (): Router => {
  const router = PromiseRouter();

  router.get<undefined, ApiGetRequestResponse<"/v1/me", 200>>(
    "/v1/me",
    async (req, res, next) => {
      const { username } = readLocalsMe(res);
      return res.status(200).json({
        username,
      });
    }
  );

  router.post<
    undefined,
    ApiPostRequestResponse<"/v1/me/password", 204>,
    ApiPostRequestPayload<"/v1/me/password">
  >("/v1/me/password", async (req, res, next) => {
    const { cookie } = req.query;
    const { username } = readLocalsMe(res);
    const { password } = req.body;
    const user = await Users.updatePassword(username, password);
    if (cookie === "write") {
      const jwt = signBearerToken({
        username: user.username,
        mustChangePassword: user.mustChangePassword,
      });
      writeBearerTokenCookie(res, jwt);
    }
    return res.status(204).json();
  });

  return router;
};

export default meRouter;
