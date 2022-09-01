import supertest from "supertest";
import { mockUsers } from "../testUtils/mockUsers";
import { testableApiServer } from "../testUtils/testableApiServer";

const testable = testableApiServer();
const Users = mockUsers();

describe("GET /v1/users", () => {
  testable.testWithAuthToken(
    "returns empty list if nothing found",
    async (req) => {
      Users.list.mockResolvedValueOnce([]);

      const response = await req(supertest(testable.api).get("/v1/users"));

      expect(Users.list).toHaveBeenCalledTimes(1);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual([]);
    }
  );

  testable.testWithAuthToken("returns list of users", async (req) => {
    Users.list.mockResolvedValueOnce([
      {
        id: "user-1",
        username: "user",
        mustChangePassword: false,
      },
    ]);

    const response = await req(supertest(testable.api).get("/v1/users"));

    expect(Users.list).toHaveBeenCalledTimes(1);
    expect(response.status).toEqual(200);
    expect(response.body).toEqual([
      {
        id: "user-1",
        username: "user",
        mustChangePassword: false,
      },
    ]);
  });
});

describe("POST /v1/users", () => {
  testable.testWithAuthToken("creates and returns user", async (req) => {
    Users.create.mockResolvedValueOnce({
      id: "user-1",
      username: "user",
      password: "random123",
      mustChangePassword: true,
    });

    const response = await req(
      supertest(testable.api).post("/v1/users").send({ username: "new-user" })
    );

    expect(Users.create).toHaveBeenCalledTimes(1);
    expect(Users.create).toHaveBeenNthCalledWith(1, {
      username: "new-user",
      password: expect.any(String),
      mustChangePassword: true,
    });
    expect(response.status).toEqual(201);
    expect(response.body).toEqual({
      id: "user-1",
      username: "user",
      password: expect.any(String),
      mustChangePassword: true,
    });
    const randomPassword = Users.create.mock.calls[0][0].password;
    expect(response.body.password).toEqual(randomPassword);
  });

  // TODO
  it.todo("validates username");
});

describe("DELETE /v1/users/:userId", () => {
  testable.testWithAuthToken("deletes user", async (req) => {
    Users.find.mockResolvedValueOnce({
      id: "user-1",
      username: "user",
      mustChangePassword: false,
    });
    Users.delete.mockResolvedValueOnce();

    const response = await req(
      supertest(testable.api).delete("/v1/users/user-1")
    );

    expect(Users.find).toHaveBeenCalledTimes(1);
    expect(Users.find).toHaveBeenNthCalledWith(1, "user-1");
    expect(Users.delete).toHaveBeenCalledTimes(1);
    expect(Users.delete).toHaveBeenNthCalledWith(1, "user-1");
    expect(response.status).toEqual(204);
    expect(response.body).toEqual({});
  });

  testable.testWithAuthToken(
    "prevents deleting self",
    async (req, meUsername) => {
      Users.find.mockResolvedValue({
        id: "user-1",
        username: meUsername,
        mustChangePassword: false,
      });
      Users.delete.mockResolvedValueOnce();

      const response = await req(
        supertest(testable.api).delete("/v1/users/user-1").expect(401)
      );

      expect(Users.find).toHaveBeenCalledTimes(1);
      expect(Users.find).toHaveBeenNthCalledWith(1, "user-1");
      expect(Users.delete).toHaveBeenCalledTimes(0);
      expect(response.status).toEqual(401);
      expect(response.body).toMatchObject({
        error: {
          message: "no permission to delete self",
        },
      });
    }
  );
});
