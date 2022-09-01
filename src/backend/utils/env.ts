import { asInt } from "./envUtils";

const env = {
  shipmightVersion: process.env.SHIPMIGHT_VERSION,
  shipmightCommit: process.env.SHIPMIGHT_COMMIT,

  releaseNamespace: process.env.RELEASE_NAMESPACE,
  releaseName: process.env.RELEASE_NAME,

  log: process.env.LOG || "",
  logFormat: process.env.LOG_FORMAT || "",
  noColor: process.env.NO_COLOR || false,

  uiPort: asInt(process.env.UI_PORT, 3000),
  apiPort: asInt(process.env.API_PORT, 3001),

  uiApiProxyEndpoint: process.env.UI_API_PROXY_ENDPOINT,
  uiIngressPath: process.env.UI_INGRESS_PATH || "", // Trim leading slash?

  readableUuids: process.env.READABLE_UUIDS === "true",
  uuidLength: asInt(process.env.UUID_LENGTH, 5),

  lokiEndpoint: process.env.LOKI_ENDPOINT || "",

  initialAdminUser: process.env.INITIAL_ADMIN_USER,
  initialAdminPass: process.env.INITIAL_ADMIN_PASS,
  jwtSecret: process.env.JWT_SECRET,

  selfUpdateRepository: process.env.SELF_UPDATE_REPOSITORY || "",
};

if (process.env.NODE_ENV !== "production") {
  env.releaseNamespace = "shipmight";
  env.releaseName = "shipmight";

  env.logFormat = "pretty";

  env.uiApiProxyEndpoint = `http://localhost:${env.apiPort}`;

  env.lokiEndpoint = `http://localhost:7001`;

  env.readableUuids = true;

  env.initialAdminUser = "admin";
  env.initialAdminPass = "admin";
  env.jwtSecret = "mock secret for dev";

  env.selfUpdateRepository = "https://shipmight.github.io/helm-charts";
}

export default env;
