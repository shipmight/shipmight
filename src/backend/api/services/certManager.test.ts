import { mockKubernetes } from "../testUtils/mockKubernetes";
import { getCertManagerIssuers } from "./certManager";

const kubernetes = mockKubernetes();

describe("getCertManagerIssuers", () => {
  it("lists none if there are none", async () => {
    kubernetes.listClusterIssuers.mockResolvedValueOnce([]);

    const issuers = await getCertManagerIssuers();

    expect(kubernetes.listClusterIssuers).toHaveBeenCalledTimes(1);
    expect(kubernetes.listClusterIssuers).toHaveBeenNthCalledWith(
      1,
      "cert-manager-issuer.shipmight.com/id"
    );
    expect(issuers).toEqual([]);
  });

  it("lists found issuers", async () => {
    kubernetes.listClusterIssuers.mockResolvedValueOnce([
      {
        metadata: {
          name: "foobar-issuer-1",
          labels: {},
          annotations: {},
        },
      },
      {
        metadata: {
          name: "foobar-issuer-2",
          labels: {},
          annotations: {},
        },
      },
    ]);

    const issuers = await getCertManagerIssuers();

    expect(kubernetes.listClusterIssuers).toHaveBeenCalledTimes(1);
    expect(kubernetes.listClusterIssuers).toHaveBeenNthCalledWith(
      1,
      "cert-manager-issuer.shipmight.com/id"
    );
    expect(issuers).toEqual([
      {
        kubeName: "foobar-issuer-1",
        name: "foobar-issuer-1",
      },
      {
        kubeName: "foobar-issuer-2",
        name: "foobar-issuer-2",
      },
    ]);
  });

  it("uses name from annotation if present", async () => {
    kubernetes.listClusterIssuers.mockResolvedValueOnce([
      {
        metadata: {
          name: "foobar-issuer-1",
          labels: {},
          annotations: {
            "cert-manager-issuer.shipmight.com/name": "Nice Issuer Name 1",
          },
        },
      },
    ]);

    const issuers = await getCertManagerIssuers();

    expect(kubernetes.listClusterIssuers).toHaveBeenCalledTimes(1);
    expect(kubernetes.listClusterIssuers).toHaveBeenNthCalledWith(
      1,
      "cert-manager-issuer.shipmight.com/id"
    );
    expect(issuers).toEqual([
      {
        kubeName: "foobar-issuer-1",
        name: "Nice Issuer Name 1",
      },
    ]);
  });
});
