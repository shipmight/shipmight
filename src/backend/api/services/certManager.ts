import { listClusterIssuers } from "../../utils/kubernetes";

interface CertManagerIssuer {
  kubeName: string;
  name: string;
}

export const getCertManagerIssuers = async (): Promise<CertManagerIssuer[]> => {
  const clusterIssuers = await listClusterIssuers(
    "cert-manager-issuer.shipmight.com/id"
  );
  const certManagerIssuers = clusterIssuers.map((clusterIssuer) => {
    const kubeName = clusterIssuer.metadata.name;
    return {
      kubeName,
      name:
        clusterIssuer.metadata.annotations[
          "cert-manager-issuer.shipmight.com/name"
        ] || kubeName,
    };
  });
  return certManagerIssuers;
};
