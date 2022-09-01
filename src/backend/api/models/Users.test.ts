import { V1Secret } from "@kubernetes/client-node";
import { components } from "../generated/apiSchema";
import { mockKubernetes } from "../testUtils/mockKubernetes";
import { nockHttp } from "../testUtils/nockHttp";
import { restoreAllMocks } from "../testUtils/restoreAllMocks";
import Users from "./Users";

restoreAllMocks();
nockHttp();
const kubernetes = mockKubernetes();

describe("list", () => {
  it("returns empty list", async () => {
    kubernetes.listNamespacedSecrets.mockResolvedValueOnce([]);

    const users = await Users.list();

    expect(kubernetes.listNamespacedSecrets).toHaveBeenCalledTimes(1);
    expect(kubernetes.listNamespacedSecrets).toHaveBeenNthCalledWith(
      1,
      "shipmight",
      "user.shipmight.com/id"
    );
    expect(users).toEqual([]);
  });

  it("returns list of users", async () => {
    kubernetes.listNamespacedSecrets.mockResolvedValueOnce([
      {
        metadata: {
          labels: {
            "user.shipmight.com/id": "admin-1",
            "user.shipmight.com/username": "admin",
          },
          annotations: {
            "user.shipmight.com/must-change-password": "false",
          },
        },
      },
      {
        metadata: {
          labels: {
            "user.shipmight.com/id": "foobar1-1",
            "user.shipmight.com/username": "foobar1",
          },
          annotations: {
            "user.shipmight.com/must-change-password": "true",
          },
        },
      },
    ]);

    const users = await Users.list();

    expect(kubernetes.listNamespacedSecrets).toHaveBeenCalledTimes(1);
    expect(kubernetes.listNamespacedSecrets).toHaveBeenNthCalledWith(
      1,
      "shipmight",
      "user.shipmight.com/id"
    );
    expect(users).toEqual([
      {
        id: "admin-1",
        mustChangePassword: false,
        username: "admin",
      },
      {
        id: "foobar1-1",
        mustChangePassword: true,
        username: "foobar1",
      },
    ]);
  });
});

describe("create", () => {
  it("creates user", async () => {
    kubernetes.createSecret.mockResolvedValueOnce({});
    jest
      .spyOn(Users, "findByUsernameIfExists")
      .mockImplementationOnce(async () => {
        return undefined;
      });
    const mockedCreatedUser: components["schemas"]["User"] = {
      id: "foobar-1",
      username: "foobar",
      mustChangePassword: true,
    };
    jest.spyOn(Users, "findByUsername").mockImplementationOnce(async () => {
      return mockedCreatedUser;
    });

    const returnedUser = await Users.create({
      username: "foobar",
      password: "secret123",
      mustChangePassword: true,
    });

    expect(kubernetes.createSecret).toHaveBeenCalledTimes(1);
    expect(kubernetes.createSecret).toHaveBeenNthCalledWith(1, "shipmight", {
      metadata: {
        namespace: "shipmight",
        name: expect.any(String),
        labels: {
          "app.kubernetes.io/managed-by": "shipmight",
          "user.shipmight.com/id": expect.any(String),
          "user.shipmight.com/username": "foobar",
        },
        annotations: {
          "user.shipmight.com/must-change-password": "true",
        },
      },
      data: {
        hashedPassword: expect.any(String),
      },
    });
    const userId = kubernetes.createSecret.mock.calls[0][1].metadata.name;
    expect(
      kubernetes.createSecret.mock.calls[0][1].metadata.labels[
        "user.shipmight.com/id"
      ]
    ).toEqual(userId);
    expect(Users.findByUsernameIfExists).toHaveBeenCalledTimes(1);
    expect(Users.findByUsernameIfExists).nthCalledWith(1, "foobar");
    expect(Users.findByUsername).toHaveBeenCalledTimes(1);
    expect(Users.findByUsername).nthCalledWith(1, "foobar");
    expect(returnedUser).toBe(mockedCreatedUser);
  });

  it("throws if username is already in use", async () => {
    kubernetes.createSecret.mockResolvedValueOnce({});
    jest
      .spyOn(Users, "findByUsernameIfExists")
      .mockImplementationOnce(async () => {
        return {
          id: "foobar-1",
          username: "foobar",
          mustChangePassword: true,
        };
      });

    await expect(async () => {
      await Users.create({
        username: "foobar",
        password: "secret123",
        mustChangePassword: true,
      });
    }).rejects.toThrow(/username foobar already in use/);

    expect(kubernetes.createSecret).toHaveBeenCalledTimes(0);
    expect(Users.findByUsernameIfExists).toHaveBeenCalledTimes(1);
    expect(Users.findByUsernameIfExists).nthCalledWith(1, "foobar");
  });
});

describe("verifyPassword", () => {
  const mockedUser: components["schemas"]["User"] = {
    id: "foobar-1",
    username: "foobar",
    password: "secret123",
    mustChangePassword: true,
  };
  let userSecret: V1Secret;
  beforeAll(async () => {
    // In the following mocks, use the actual Secret as it is created by
    // Users.create(), to make sure verifying hashes stays up to date with it
    kubernetes.createSecret.mockResolvedValueOnce({});
    jest.spyOn(Users, "findByUsername").mockImplementation(async () => {
      return mockedUser;
    });
    await Users.create(mockedUser);
    userSecret = kubernetes.createSecret.mock.calls[0][1];
  });

  it("returns user when password is correct", async () => {
    kubernetes.listNamespacedSecrets.mockResolvedValueOnce([userSecret]);
    jest.spyOn(Users, "findByUsername").mockImplementation(async () => {
      return mockedUser;
    });

    const returnedUser = await Users.verifyPassword("foobar", "secret123");

    expect(kubernetes.listNamespacedSecrets).toHaveBeenCalledTimes(1);
    expect(kubernetes.listNamespacedSecrets).toHaveBeenNthCalledWith(
      1,
      "shipmight",
      "user.shipmight.com/username=foobar"
    );
    expect(returnedUser).toBe(mockedUser);
  });

  it("returns undefined when password is incorrect", async () => {
    kubernetes.listNamespacedSecrets.mockResolvedValueOnce([userSecret]);
    jest.spyOn(Users, "findByUsername").mockImplementation(async () => {
      return mockedUser;
    });

    const returnedUser = await Users.verifyPassword("foobar", "this is wrong");

    expect(kubernetes.listNamespacedSecrets).toHaveBeenCalledTimes(1);
    expect(kubernetes.listNamespacedSecrets).toHaveBeenNthCalledWith(
      1,
      "shipmight",
      "user.shipmight.com/username=foobar"
    );
    expect(returnedUser).toBe(undefined);
  });

  it("returns undefined when password is empty", async () => {
    kubernetes.listNamespacedSecrets.mockResolvedValueOnce([userSecret]);
    jest.spyOn(Users, "findByUsername").mockImplementation(async () => {
      return mockedUser;
    });

    const returnedUser = await Users.verifyPassword("foobar", "");

    expect(kubernetes.listNamespacedSecrets).toHaveBeenCalledTimes(1);
    expect(kubernetes.listNamespacedSecrets).toHaveBeenNthCalledWith(
      1,
      "shipmight",
      "user.shipmight.com/username=foobar"
    );
    expect(returnedUser).toBe(undefined);
  });
});

describe("delete", () => {
  it("throws is user is not found", async () => {
    jest.spyOn(Users, "find").mockImplementation(async () => {
      throw new Error("mocked not found error from find");
    });
    kubernetes.deleteSecret.mockResolvedValueOnce();

    await expect(async () => {
      await Users.delete("admin");
    }).rejects.toThrow(/mocked not found error from find/);

    expect(Users.find).toHaveBeenCalledTimes(1);
    expect(Users.find).nthCalledWith(1, "admin");
    expect(kubernetes.deleteSecret).toHaveBeenCalledTimes(0);
  });

  it("deletes user", async () => {
    jest.spyOn(Users, "find").mockImplementation(async () => {
      return {
        id: "admin-1",
        username: "admin",
        mustChangePassword: false,
      };
    });
    kubernetes.deleteSecret.mockResolvedValueOnce();

    await Users.delete("admin-1");

    expect(Users.find).toHaveBeenCalledTimes(1);
    expect(Users.find).nthCalledWith(1, "admin-1");
    expect(kubernetes.deleteSecret).toHaveBeenCalledTimes(1);
    expect(kubernetes.deleteSecret).toHaveBeenNthCalledWith(
      1,
      "shipmight",
      "admin-1"
    );
  });
});
