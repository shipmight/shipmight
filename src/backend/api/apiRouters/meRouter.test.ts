import supertest from "supertest";
import { mockUsers } from "../testUtils/mockUsers";
import { testableApiServer } from "../testUtils/testableApiServer";

const testable = testableApiServer();
const Users = mockUsers();

describe("GET /v1/me", () => {
  testable.testWithAuthToken(
    "returns current user",
    async (req, meUsername) => {
      const response = await req(supertest(testable.api).get("/v1/me"));

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        username: meUsername,
      });
    },
    { skip: ["reset-password-check"] }
  );
});

describe("POST /me/password", () => {
  testable.testWithAuthToken(
    "resets user password",
    async (req, meUsername) => {
      Users.updatePassword.mockResolvedValueOnce({
        id: "not used",
        username: meUsername,
        mustChangePassword: false,
      });

      const response = await req(
        supertest(testable.api)
          .post("/v1/me/password")
          .send({ password: "new password" })
      );

      expect(Users.updatePassword).toHaveBeenCalledTimes(1);
      expect(Users.updatePassword).toHaveBeenNthCalledWith(
        1,
        meUsername,
        "new password"
      );
      expect(response.status).toEqual(204);
      expect(response.body).toEqual({});
      expect(response.headers).not.toHaveProperty("set-cookie");
    },
    { skip: ["reset-password-check"] }
  );

  testable.testWithAuthToken(
    "returns cookie when ?cookie=write",
    async (req, meUsername) => {
      Users.updatePassword.mockResolvedValueOnce({
        id: "not used",
        username: meUsername,
        mustChangePassword: false,
      });

      const response = await req(
        supertest(testable.api)
          .post("/v1/me/password?cookie=write")
          .send({ password: "new password" })
      );

      expect(Users.updatePassword).toHaveBeenCalledTimes(1);
      expect(Users.updatePassword).toHaveBeenNthCalledWith(
        1,
        meUsername,
        "new password"
      );
      expect(response.status).toEqual(204);
      expect(response.body).toEqual({});
      expect(response.headers).toHaveProperty("set-cookie");
      expect(response.headers["set-cookie"]).toHaveLength(1);
      expect(response.headers["set-cookie"][0]).toMatch(
        /shipmightBearerToken=[A-Za-z0-9]+.[A-Za-z0-9]+.[A-Za-z0-9_-]+; Path=\/; HttpOnly; SameSite=Strict/
      );
    },
    { skip: ["reset-password-check"] }
  );
});
