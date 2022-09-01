import supertest from "supertest";
import { mockKubernetes } from "../testUtils/mockKubernetes";
import { testableApiServer } from "../testUtils/testableApiServer";

const testable = testableApiServer();
const kubernetes = mockKubernetes();

describe("GET /v1/readyz", () => {
  it("returns 200", async () => {
    kubernetes.kubeReadyz.mockResolvedValueOnce();

    const response = await supertest(testable.api).get("/v1/readyz");

    expect(kubernetes.kubeReadyz).toHaveBeenCalledTimes(1);
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({});
  });

  it("returns 503 if kube api is not available", async () => {
    kubernetes.kubeReadyz.mockRejectedValueOnce(new Error("mocked from test"));

    const response = await supertest(testable.api).get("/v1/readyz");

    expect(kubernetes.kubeReadyz).toHaveBeenCalledTimes(1);
    expect(response.status).toEqual(503);
    expect(response.body).toEqual({
      unhealthy: ["kubernetesApi"],
    });
  });
});
