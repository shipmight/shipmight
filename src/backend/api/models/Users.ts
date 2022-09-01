import { V1Secret } from "@kubernetes/client-node";
import { checkPassword, hashPassword } from "../../utils/crypto";
import {
  createSecret,
  deleteSecret,
  listNamespacedSecrets,
  listSecrets,
  replaceSecret,
} from "../../utils/kubernetes";
import { toBase64, transformToId } from "../../utils/string";
import { components } from "../generated/apiSchema";

type User = components["schemas"]["User"];

function userToSecret({
  id,
  username,
  mustChangePassword,
  hashedPassword,
}: User & {
  hashedPassword: string;
}): V1Secret {
  const namespace = "shipmight";
  const kubeName = id;
  return {
    metadata: {
      namespace,
      name: kubeName,
      labels: {
        "app.kubernetes.io/managed-by": "shipmight",
        "user.shipmight.com/id": id,
        "user.shipmight.com/username": username,
      },
      annotations: {
        "user.shipmight.com/must-change-password": mustChangePassword
          ? "true"
          : "false",
      },
    },
    data: {
      hashedPassword: toBase64(hashedPassword),
    },
  };
}

function secretToUser(secret: V1Secret): User {
  return {
    id: secret.metadata.labels["user.shipmight.com/id"],
    username: secret.metadata.labels["user.shipmight.com/username"],
    mustChangePassword:
      secret.metadata.annotations["user.shipmight.com/must-change-password"] ===
      "true",
  };
}

export default class Users {
  static async list(): Promise<User[]> {
    const secrets = await listNamespacedSecrets(
      "shipmight",
      "user.shipmight.com/id"
    );
    const users = secrets.map((secret) => secretToUser(secret));
    users.sort((a, b) => a.username.localeCompare(b.username));
    return users;
  }

  static async find(userId: string): Promise<User> {
    const secrets = await listSecrets(`user.shipmight.com/id=${userId}`);
    if (secrets.length !== 1) {
      throw new Error(`user ${userId} not found`);
    }
    const secret = secrets[0];
    const user = secretToUser(secret);
    return user;
  }

  static async findByUsernameIfExists(username: string): Promise<User> {
    const secrets = await listSecrets(
      `user.shipmight.com/username=${username}`
    );
    if (secrets.length !== 1) {
      return undefined;
    }
    const secret = secrets[0];
    const user = secretToUser(secret);
    return user;
  }

  static async findByUsername(username: string): Promise<User> {
    const user = await Users.findByUsernameIfExists(username);
    if (!user) {
      throw new Error(`user ${username} not found`);
    }
    return user;
  }

  static async create({
    username,
    password,
    mustChangePassword,
  }: Pick<
    User,
    "username" | "password" | "mustChangePassword"
  >): Promise<User> {
    const existingUser = await Users.findByUsernameIfExists(username);
    if (existingUser) {
      throw new Error(`username ${username} already in use`);
    }
    const id = transformToId(username);
    const hashedPassword = await hashPassword(password);
    const secret = userToSecret({
      id,
      username,
      mustChangePassword,
      hashedPassword,
    });
    await createSecret(secret.metadata.namespace, secret);
    const user = await Users.findByUsername(username);
    return user;
  }

  static async verifyPassword(
    username: string,
    password: string
  ): Promise<User | undefined> {
    const secrets = await listNamespacedSecrets(
      "shipmight",
      `user.shipmight.com/username=${username}`
    );
    if (secrets.length !== 1) {
      return undefined;
    }
    const secret = secrets[0];
    const hashedPassword = Buffer.from(
      secret.data.hashedPassword,
      "base64"
    ).toString("utf-8");
    const valid = await checkPassword(password, hashedPassword);
    if (!valid) {
      return undefined;
    }
    const user = await Users.findByUsername(username);
    return user;
  }

  static async updatePassword(
    username: string,
    newPassword: string
  ): Promise<User> {
    const user = await Users.findByUsername(username);
    const hashedPassword = await hashPassword(newPassword);
    const secret = userToSecret({
      ...user,
      hashedPassword,
      mustChangePassword: false,
    });
    await replaceSecret(
      secret.metadata.namespace,
      secret.metadata.name,
      secret
    );
    const updatedUser = await Users.findByUsername(username);
    return updatedUser;
  }

  static async delete(userId: string): Promise<void> {
    const user = await Users.find(userId);
    const secret = userToSecret({
      ...user,
      // Just using metadata.namespace and metadata.name, these properties don't matter
      hashedPassword: "",
      mustChangePassword: false,
    });
    await deleteSecret(secret.metadata.namespace, secret.metadata.name);
  }
}
