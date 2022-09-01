import { V1Namespace } from "@kubernetes/client-node";
import { createNamespace, listNamespaces } from "../../utils/kubernetes";
import { transformToId } from "../../utils/string";
import { components } from "../generated/apiSchema";
import Domains from "./Domains";

type Project = components["schemas"]["Project"];

const projectToNamespace = ({ id, name }: Project): V1Namespace => {
  const kubeName = id;
  return {
    metadata: {
      name: kubeName,
      labels: {
        "app.kubernetes.io/managed-by": "shipmight",
        "project.shipmight.com/id": id,
      },
      annotations: {
        "project.shipmight.com/name": name,
      },
    },
  };
};

function namespaceToProject(namespace: V1Namespace): Project {
  return {
    id: namespace.metadata.labels["project.shipmight.com/id"],
    name: namespace.metadata.annotations["project.shipmight.com/name"],
  };
}

export default class Projects {
  static async create({ name }: Pick<Project, "name">): Promise<Project> {
    const id = transformToId(name);
    const namespace = projectToNamespace({ id, name });
    await createNamespace(namespace);
    const project = await Projects.find(id);
    return project;
  }

  static async list(): Promise<Project[]> {
    const namespaces = await listNamespaces("project.shipmight.com/id");
    const projects = namespaces.map((namespace) =>
      namespaceToProject(namespace)
    );
    projects.sort((a, b) => a.name.localeCompare(b.name));
    return projects;
  }

  static async findIfExists(projectId: string): Promise<Project | undefined> {
    const namespaces = await listNamespaces(
      `project.shipmight.com/id=${projectId}`
    );
    if (namespaces.length !== 1) {
      return undefined;
    }
    const namespace = namespaces[0];
    const project = namespaceToProject(namespace);
    return project;
  }

  static async find(projectId: string): Promise<Project> {
    const project = await Projects.findIfExists(projectId);
    if (!project) {
      throw new Error(`project ${projectId} not found`);
    }
    return project;
  }

  static async getGroupedPerLinkedMasterDomainHostname(): Promise<{
    [masterDomainHostname: string]: Project[];
  }> {
    const [domains, projects] = await Promise.all([
      Domains.listFromAllProjects(),
      Projects.list(),
    ]);
    const grouped: { [masterDomainHostname: string]: Project[] } = {};
    for (const domain of domains) {
      grouped[domain.hostname] = grouped[domain.hostname] || [];
      const { projectId } = domain;
      const project = projects.find((project) => project.id === projectId);
      if (
        !grouped[domain.hostname].some((project) => project.id === projectId)
      ) {
        grouped[domain.hostname].push(project);
      }
    }
    return grouped;
  }
}
