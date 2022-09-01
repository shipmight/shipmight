import { V1Ingress } from "@kubernetes/client-node";
import {
  createIngress,
  deleteIngress,
  KubernetesApiError,
  listIngresses,
  listNamespacedCertificates,
  replaceIngress,
  V1Certificate,
} from "../../utils/kubernetes";
import { getLogger } from "../../utils/logging";
import { components } from "../generated/apiSchema";
import Projects from "./Projects";

const log = getLogger("api:models:MasterDomains");

type MasterDomain = components["schemas"]["MasterDomain"];

const masterDomainToIngress = ({
  hostname,
  certManagerClusterIssuer,
}: Omit<MasterDomain, "tlsCertificateStatus">): V1Ingress => {
  const namespace = "shipmight";
  const kubeName = hostname;
  const secretName = `${hostname}-tls`;
  return {
    metadata: {
      namespace,
      name: kubeName,
      labels: {
        "app.kubernetes.io/managed-by": "shipmight",
        "master-domain.shipmight.com/hostname": hostname,
      },
      annotations: {
        "kubernetes.io/ingress.class": "nginx",
        "nginx.org/mergeable-ingress-type": "master",
        ...(certManagerClusterIssuer
          ? {
              "cert-manager.io/cluster-issuer": certManagerClusterIssuer,
            }
          : {}),
      },
    },
    spec: {
      rules: [
        {
          host: hostname,
        },
      ],
      tls: certManagerClusterIssuer
        ? [
            {
              hosts: [hostname],
              secretName,
            },
          ]
        : [],
    },
  };
};

const ingressToMasterDomain = (
  ingress: V1Ingress,
  certificate: V1Certificate | null
): MasterDomain => {
  let tlsCertificateStatus: MasterDomain["tlsCertificateStatus"] = "NONE";
  if (certificate) {
    const conditionTypes = certificate.status.conditions
      .filter((condition) => condition.status === "True")
      .map((condition) => condition.type);
    if (conditionTypes.includes("Ready")) {
      tlsCertificateStatus = "READY";
    } else {
      tlsCertificateStatus = "UPDATING";
    }
  } else if (ingress.metadata.annotations["cert-manager.io/cluster-issuer"]) {
    tlsCertificateStatus = "UPDATING";
  }
  return {
    hostname: ingress.metadata.labels["master-domain.shipmight.com/hostname"],
    certManagerClusterIssuer:
      ingress.metadata.annotations["cert-manager.io/cluster-issuer"],
    tlsCertificateStatus,
  };
};

const getCertificatesForIngresses = async (
  ingresses: V1Ingress[]
): Promise<(V1Certificate | null)[]> => {
  const certificates = await listNamespacedCertificates("shipmight", "");
  return ingresses.map((ingress) => {
    if (ingress.spec.tls) {
      const secretName = ingress.spec.tls[0].secretName;
      const certificate = certificates.find(
        (certificate) => certificate.metadata.name === secretName
      );
      return certificate || null;
    }
    return null;
  });
};

export default class MasterDomains {
  static async list(): Promise<MasterDomain[]> {
    const ingresses = await listIngresses(
      "master-domain.shipmight.com/hostname"
    );
    const certificates = await getCertificatesForIngresses(ingresses);
    const masterDomains = ingresses.map((ingress, index) =>
      ingressToMasterDomain(ingress, certificates[index])
    );
    masterDomains.sort((a, b) => a.hostname.localeCompare(b.hostname));
    return masterDomains;
  }

  static async findIfExists(hostname: string): Promise<MasterDomain> {
    const ingresses = await listIngresses(
      `master-domain.shipmight.com/hostname=${hostname}`
    );
    if (ingresses.length !== 1) {
      return undefined;
    }
    const certificates = await getCertificatesForIngresses(ingresses);
    const ingress = ingresses[0];
    const certificate = certificates[0];
    const masterDomain = ingressToMasterDomain(ingress, certificate);
    return masterDomain;
  }

  static async find(hostname: string): Promise<MasterDomain> {
    const masterDomain = await MasterDomains.findIfExists(hostname);
    if (!masterDomain) {
      throw new Error(`masterDomain ${hostname} not found`);
    }
    return masterDomain;
  }

  static async create({
    hostname,
    certManagerClusterIssuer,
  }: Omit<MasterDomain, "tlsCertificateStatus">): Promise<void> {
    const ingress = masterDomainToIngress({
      hostname,
      certManagerClusterIssuer,
    });
    await createIngress(ingress.metadata.namespace, ingress);
  }

  static async createIfNotExists({
    hostname,
    certManagerClusterIssuer,
  }: Omit<MasterDomain, "tlsCertificateStatus">): Promise<void> {
    try {
      await MasterDomains.create({ hostname, certManagerClusterIssuer });
    } catch (error) {
      if (
        error instanceof KubernetesApiError &&
        error.status.reason === `AlreadyExists`
      ) {
        log.info({ message: "already exists, updating", hostname });
        await MasterDomains.update({
          hostname,
          certManagerClusterIssuer,
        });
      } else {
        throw error;
      }
    }
  }

  static async delete(hostname: string): Promise<void> {
    const masterDomain = await MasterDomains.find(hostname);
    const ingress = masterDomainToIngress(masterDomain);
    const grouped = await Projects.getGroupedPerLinkedMasterDomainHostname();
    if (
      grouped[masterDomain.hostname] &&
      grouped[masterDomain.hostname].length > 0
    ) {
      throw new Error(
        "master domain is used in one or more projects, cannot delete"
      );
    }
    await deleteIngress(ingress.metadata.namespace, ingress.metadata.name);
  }

  static async update({
    hostname,
    certManagerClusterIssuer,
  }: Omit<MasterDomain, "tlsCertificateStatus">): Promise<void> {
    const ingress = masterDomainToIngress({
      hostname,
      certManagerClusterIssuer,
    });
    await replaceIngress(
      ingress.metadata.namespace,
      ingress.metadata.name,
      ingress
    );
  }
}
