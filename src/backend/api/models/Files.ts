import { V1Secret } from "@kubernetes/client-node";
import {
  createSecret,
  deleteSecret,
  listSecrets,
  replaceSecret,
} from "../../utils/kubernetes";
import { getLogger } from "../../utils/logging";
import { fromBase64, toBase64, transformToId } from "../../utils/string";
import { components } from "../generated/apiSchema";
import Apps from "./Apps";

const log = getLogger("api:models:Files");

type File = components["schemas"]["File"];

function fileToSecret({
  projectId,
  id,
  name,
  isSecret,
  revision,
  content,
}: File): V1Secret {
  const namespace = projectId;
  const kubeName = id;
  return {
    metadata: {
      namespace,
      name: kubeName,
      labels: {
        "app.kubernetes.io/managed-by": "shipmight",
        "file.shipmight.com/id": id,
        "file.shipmight.com/project-id": projectId,
      },
      annotations: {
        "file.shipmight.com/name": name,
        "file.shipmight.com/is-secret": isSecret ? "true" : "false",
        "file.shipmight.com/revision": revision.toString(),
      },
    },
    data: {
      content: toBase64(content),
    },
  };
}

function secretToFile(secret: V1Secret): File {
  const isSecret =
    secret.metadata.annotations["file.shipmight.com/is-secret"] === "true";
  return {
    id: secret.metadata.labels["file.shipmight.com/id"],
    projectId: secret.metadata.labels["file.shipmight.com/project-id"],
    name: secret.metadata.annotations["file.shipmight.com/name"],
    isSecret,
    content: isSecret ? "" : fromBase64(secret.data.content),
    revision: parseInt(
      secret.metadata.annotations["file.shipmight.com/revision"]
    ),
  };
}

export default class Files {
  static async list(projectId: string): Promise<File[]> {
    const secrets = await listSecrets(
      `file.shipmight.com/project-id=${projectId}`
    );
    const files = secrets.map((secret) => secretToFile(secret));
    files.sort((a, b) => a.name.localeCompare(b.name));
    return files;
  }

  static async findIfExists(id: string): Promise<File> {
    const secrets = await listSecrets(`file.shipmight.com/id=${id}`);
    if (secrets.length !== 1) {
      return undefined;
    }
    const secret = secrets[0];
    const file = secretToFile(secret);
    return file;
  }

  static async find(fileId: string): Promise<File> {
    const file = await Files.findIfExists(fileId);
    if (!file) {
      throw new Error(`file ${fileId} not found`);
    }
    return file;
  }

  static async create(
    projectId: string,
    { name, isSecret, content }: Omit<File, "id" | "projectId" | "revision">
  ): Promise<File> {
    const id = transformToId(name);
    const revision = 1;
    const secret = fileToSecret({
      projectId,
      id,
      name,
      isSecret,
      revision,
      content,
    });
    await createSecret(secret.metadata.namespace, secret);
    const file = await Files.find(id);
    return file;
  }

  static async update(
    fileId: string,
    data: Pick<File, "name" | "isSecret" | "content">
  ): Promise<File> {
    const file = await Files.find(fileId);
    const secret = fileToSecret({
      ...file,
      ...data,
      isSecret: file.isSecret ? true : data.isSecret,
      revision: file.revision + 1,
    });
    await replaceSecret(
      secret.metadata.namespace,
      secret.metadata.name,
      secret
    );
    const updated = await Files.find(fileId);
    return updated;
  }

  static async delete(fileId: string): Promise<void> {
    const file = await Files.find(fileId);
    const linkedApps = await Apps.listViaLink("linked-file-id", fileId);
    if (linkedApps.length > 0) {
      log.error({
        message: "could not delete file because it is linked to an app",
        linkedAppIds: linkedApps.map((app) => app.id),
      });
      throw new Error("file is linked to one or more apps, cannot delete");
    }
    const secret = fileToSecret(file);
    await deleteSecret(secret.metadata.namespace, secret.metadata.name);
  }

  static async getFileMountsList(
    items: { fileId: string; mountPath: string }[]
  ): Promise<
    {
      mountPath: string;
      secretId: string;
      secretKey: string;
    }[]
  > {
    return Promise.all(
      items.map(async ({ fileId, mountPath }, index) => {
        const file = await Files.find(fileId);
        const secret = fileToSecret(file);
        const fileMountId = `file-mount-${file.revision}-${index}`;
        return {
          mountPath,
          fileMountId,
          secretId: secret.metadata.name,
          secretKey: "content",
        };
      })
    );
  }
}
