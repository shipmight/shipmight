import { Router } from "express";
import PromiseRouter from "express-promise-router";
import { randomCharacters } from "../../utils/crypto";
import AuthorizationError from "../AuthorizationError";
import { paths } from "../generated/apiSchema";
import { readLocalsMe, readLocalsUser, setLocalsUser } from "../locals";
import Users from "../models/Users";
import NotFoundError from "../NotFoundError";
import {
  ApiDeleteRequestResponse,
  ApiGetRequestResponse,
  ApiPostRequestPayload,
  ApiPostRequestResponse,
} from "../requests";

const usersRouter = (): Router => {
  const router = PromiseRouter();

  router.get<undefined, ApiGetRequestResponse<"/v1/users", 200>>(
    "/v1/users",
    async (req, res, next) => {
      const users = await Users.list();
      return res.status(200).json(users);
    }
  );

  router.post<
    undefined,
    ApiPostRequestResponse<"/v1/users", 201>,
    ApiPostRequestPayload<"/v1/users">
  >("/v1/users", async (req, res, next) => {
    const { username } = req.body;
    const password = randomCharacters(16);
    const user = await Users.create({
      username,
      password,
      mustChangePassword: true,
    });
    return res.status(201).json({
      ...user,
      password,
    });
  });

  router.use<paths["/v1/users/{userId}"]["parameters"]["path"]>(
    "/v1/users/:userId",
    async (req, res, next) => {
      const { userId } = req.params;
      const user = await Users.find(userId);
      if (!user) {
        throw new NotFoundError(`user ${userId} not found`);
      }
      setLocalsUser(res, user);
      next();
    }
  );

  router.delete<undefined, ApiDeleteRequestResponse<"/v1/users/{userId}", 204>>(
    "/v1/users/:userId",
    async (req, res, next) => {
      const me = readLocalsMe(res);
      const user = readLocalsUser(res);
      if (user.username === me.username) {
        throw new AuthorizationError("no permission to delete self");
      }
      await Users.delete(user.id);
      res.status(204).json();
    }
  );

  return router;
};

export default usersRouter;
