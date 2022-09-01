import express, { ErrorRequestHandler } from "express";
import PromiseRouter from "express-promise-router";
import bodyParser from "body-parser";
import * as OpenApiValidator from "express-openapi-validator";
import semver from "semver";
import { randomCharacters } from "../utils/crypto";
import { expressLogger, getLogger } from "../utils/logging";
import { components, paths } from "./generated/apiSchema";
import apiSchema from "./apiSchema.json";
import Projects from "./models/Projects";
import {
  ApiDeleteRequestResponse,
  ApiGetRequestResponse,
  ApiPostRequestPayload,
  ApiPostRequestResponse,
} from "./requests";
import AuthorizationError from "./AuthorizationError";
import {
  signBearerToken,
  verifyBearerToken,
  writeBearerTokenCookie,
} from "./jwt";
import NotFoundError from "./NotFoundError";
import Registries from "./models/Registries";
import Domains from "./models/Domains";
import AppCharts from "./models/AppCharts";
import Apps from "./models/Apps";
import Files from "./models/Files";
import { getPodsTop, getKubeVersion } from "../utils/kubernetes";
import Users from "./models/Users";
import {
  getLokiLogs,
  isLokiInstalled,
  toSingleStreamLogQl,
} from "./services/loki";
import { parse } from "cookie";
import { getLogs, parseLogParams, serveLogsResponse } from "./logUtils";
import { getProjectLogSources, getSystemLogSources } from "./logSources";
import queue from "./queue";
import { ValidationError } from "../utils/validation";
import {
  readLocalsApp,
  readLocalsDomain,
  readLocalsFile,
  readLocalsProject,
  readLocalsRegistry,
  readLocalsRequestId,
  readLocalsMe,
  setLocalsApp,
  setLocalsDomain,
  setLocalsFile,
  setLocalsProject,
  setLocalsRegistry,
  setLocalsRequestId,
  setLocalsMe,
} from "./locals";
import env from "../utils/env";
import { getRepositoryIndex } from "./helmRepo";
import { createUpgradeLock, readUpgradeLock } from "./services/upgradeLock";
import DeployHooks from "./models/DeployHooks";
import healthRouter from "./apiRouters/healthRouter";
import deployHookCallbackRouter from "./apiRouters/deployHookCallbackRouter";
import meRouter from "./apiRouters/meRouter";
import deployHooksRouter from "./apiRouters/deployHooksRouter";
import appDeploymentsRouter from "./apiRouters/appDeploymentsRouter";
import projectAppsRouter from "./apiRouters/projectAppsRouter";
import masterDomainsRouter from "./apiRouters/masterDomainsRouter";
import usersRouter from "./apiRouters/usersRouter";
import appRunsRouter from "./apiRouters/appRunsRouter";
import appReleasesRouter from "./apiRouters/appReleasesRouter";

const log = getLogger("api:apiServer");

export default function apiServer() {
  const router = PromiseRouter();

  //
  // General middlewares
  //

  router.use((req, res, next) => {
    setLocalsRequestId(res, randomCharacters(8));
    next();
  });

  router.use(expressLogger(log, { readLocalsRequestId }));

  router.use(bodyParser.json());

  type OpenApiDocument = Parameters<
    typeof OpenApiValidator.middleware
  >[0]["apiSpec"];
  router.use(
    OpenApiValidator.middleware({
      apiSpec: apiSchema as unknown as OpenApiDocument,
    })
  );

  //
  // Pre-auth
  //

  router.use(healthRouter());

  router.use(deployHookCallbackRouter());

  router.post<
    undefined,
    ApiPostRequestResponse<"/v1/tokens", 201>,
    ApiPostRequestPayload<"/v1/tokens">,
    paths["/v1/tokens"]["post"]["parameters"]["query"]
  >("/v1/tokens", async (req, res, next) => {
    const { username, password } = req.body;
    const { cookie } = req.query;
    const user = await Users.verifyPassword(username, password);
    if (user) {
      const jwt = signBearerToken({
        username: user.username,
        mustChangePassword: user.mustChangePassword,
      });
      if (cookie === "write") {
        writeBearerTokenCookie(res, jwt);
      }
      return res.status(201).json({
        jwt,
      });
    }
    throw new AuthorizationError("invalid credentials");
  });

  router.use(async (req, res, next) => {
    const requestId = readLocalsRequestId(res);
    let bearerToken: string;

    if (
      req.headers.authorization &&
      req.headers.authorization.match(/^bearer .+$/i)
    ) {
      log.info({
        requestId,
        message: "reading token from header",
      });
      bearerToken = req.headers.authorization.split(" ")[1] || undefined;
    } else if (
      req.headers.cookie &&
      req.headers.cookie.includes("shipmightBearerToken")
    ) {
      log.info({
        requestId,
        message: "reading token from cookie",
      });
      bearerToken = parse(req.headers.cookie).shipmightBearerToken || undefined;
    }

    if (!bearerToken) {
      throw new AuthorizationError("missing bearer token");
    }

    const payload = verifyBearerToken(bearerToken);

    const { username, mustChangePassword, exp } = payload;
    log.info({
      requestId,
      message: "request authenticated via bearer token",
      username,
      exp,
    });
    setLocalsMe(res, {
      username,
      mustChangePassword,
    });

    next();
  });

  //
  // Post-auth
  //

  router.get<undefined, ApiGetRequestResponse<"/v1/version", 200>>(
    "/v1/version",
    async (req, res, next) => {
      return res.status(200).json({
        version: env.shipmightVersion,
        commit: env.shipmightCommit,
      });
    }
  );

  router.use(meRouter());

  router.use((req, res, next) => {
    const requestId = readLocalsRequestId(res);
    const { mustChangePassword } = readLocalsMe(res);
    if (mustChangePassword) {
      log.info({
        requestId,
        message: "user must change password",
      });
      throw new AuthorizationError("password change required");
    }
    next();
  });

  router.post<
    undefined,
    ApiPostRequestResponse<"/v1/tokens/refresh", 201>,
    ApiPostRequestPayload<"/v1/tokens/refresh">,
    paths["/v1/tokens/refresh"]["post"]["parameters"]["query"]
  >("/v1/tokens/refresh", async (req, res, next) => {
    const { cookie } = req.query;
    const { username, mustChangePassword } = readLocalsMe(res);
    const jwt = signBearerToken({
      username,
      mustChangePassword,
    });
    if (cookie === "write") {
      writeBearerTokenCookie(res, jwt);
    }
    return res.status(201).json({
      jwt,
    });
  });

  router.post<
    undefined,
    ApiPostRequestResponse<"/v1/tokens/clear", 200>,
    ApiPostRequestPayload<"/v1/tokens/clear">,
    paths["/v1/tokens/clear"]["post"]["parameters"]["query"]
  >("/v1/tokens/clear", async (req, res, next) => {
    const { cookie } = req.query;
    if (cookie === "write") {
      writeBearerTokenCookie(res, "");
    }
    return res.status(200).json({});
  });

  router.use(masterDomainsRouter());

  router.get<undefined, ApiGetRequestResponse<"/v1/upgrade-lock", 200>>(
    "/v1/upgrade-lock",
    async (req, res, next) => {
      const upgradeLock = await readUpgradeLock();
      return res.status(200).json(upgradeLock || null);
    }
  );

  router.get<undefined, ApiGetRequestResponse<"/v1/self-update", 200>>(
    "/v1/self-update",
    async (req, res, next) => {
      if (env.selfUpdateRepository === "") {
        return res.status(200).json({
          isEnabled: false,
          availableUpdateVersion: null,
        });
      }
      const { shipmightVersion, selfUpdateRepository } = env;
      const [kubeVersion, repositoryIndex] = await Promise.all([
        getKubeVersion(),
        getRepositoryIndex(selfUpdateRepository, ["shipmight-stack"]),
      ]);
      const shipmightStackEntries =
        repositoryIndex.entries["shipmight-stack"] || [];
      const newerVersions = shipmightStackEntries.filter((entry) => {
        if (!semver.satisfies(kubeVersion.gitVersion, entry.kubeVersion)) {
          return false;
        }
        if (semver.lte(entry.version, shipmightVersion)) {
          return false;
        }
        return true;
      });
      let availableUpdateVersion: string | null = null;
      for (const entry of newerVersions) {
        if (
          availableUpdateVersion === null ||
          semver.gt(entry.version, availableUpdateVersion)
        ) {
          availableUpdateVersion = entry.version;
        }
      }
      return res.status(200).json({
        isEnabled: true,
        availableUpdateVersion,
      });
    }
  );

  router.post<
    undefined,
    ApiPostRequestResponse<"/v1/self-update", 200>,
    ApiPostRequestPayload<"/v1/self-update">
  >("/v1/self-update", async (req, res, next) => {
    if (env.selfUpdateRepository === "") {
      throw new Error("self-update is not enabled");
    }
    const upgradeLock = await readUpgradeLock();
    if (upgradeLock) {
      throw new Error("upgrade already in progress");
    }
    const { version } = req.body;
    await createUpgradeLock();
    queue.schedule({
      taskType: "upgradeShipmight",
      version,
    });
    return res.status(200).json({});
  });

  router.get<undefined, ApiGetRequestResponse<"/v1/registries", 200>>(
    "/v1/registries",
    async (req, res, next) => {
      const registries = await Registries.list();
      res.status(200).json(registries);
    }
  );

  router.post<
    undefined,
    ApiPostRequestResponse<"/v1/registries", 201>,
    ApiPostRequestPayload<"/v1/registries">
  >("/v1/registries", async (req, res, next) => {
    const registry = await Registries.create({
      name: req.body.name,
      url: req.body.url,
      authToken: req.body.authToken,
    });
    return res.status(201).json(registry);
  });

  router.get<undefined, ApiGetRequestResponse<"/v1/registries-in-apps", 200>>(
    "/v1/registries-in-apps",
    async (req, res, next) => {
      const linkedApps = await Apps.getGroupedPerLinkedResourceId(
        "linked-registry-id"
      );
      res.status(200).json(linkedApps);
    }
  );

  router.use(usersRouter());

  router.get<undefined, ApiGetRequestResponse<"/v1/app-charts", 200>>(
    "/v1/app-charts",
    async (req, res, next) => {
      const appCharts = await AppCharts.list();
      res.status(200).json(appCharts);
    }
  );

  router.get<undefined, ApiGetRequestResponse<"/v1/services", 200>>(
    "/v1/services",
    async (req, res, next) => {
      res.status(200).json({
        loki: {
          isEnabled: isLokiInstalled(),
        },
      });
    }
  );

  router.get<undefined, ApiGetRequestResponse<"/v1/projects", 200>>(
    "/v1/projects",
    async (req, res, next) => {
      const projects = await Projects.list();
      res.status(200).json(projects);
    }
  );

  // /v1/registries/:registryId

  router.use<paths["/v1/registries/{registryId}"]["parameters"]["path"]>(
    "/v1/registries/:registryId",
    async (req, res, next) => {
      const { registryId } = req.params;
      const registry = await Registries.findIfExists(registryId);
      if (!registry) {
        throw new NotFoundError(`registry ${registryId} not found`);
      }
      setLocalsRegistry(res, registry);
      next();
    }
  );

  router.post<
    undefined,
    ApiPostRequestResponse<"/v1/registries/{registryId}", 200>,
    ApiPostRequestPayload<"/v1/registries/{registryId}">
  >("/v1/registries/:registryId", async (req, res, next) => {
    const registry = readLocalsRegistry(res);
    const updatedRegistry = await Registries.update(registry.id, req.body);
    res.status(200).json(updatedRegistry);
  });

  router.delete<
    undefined,
    ApiDeleteRequestResponse<"/v1/registries/{registryId}", 204>
  >("/v1/registries/:registryId", async (req, res, next) => {
    const registry = readLocalsRegistry(res);
    await Registries.delete(registry.id);
    res.status(204).json();
  });

  // /v1/projects/:projectId

  router.use<paths["/v1/projects/{projectId}"]["parameters"]["path"]>(
    "/v1/projects/:projectId",
    async (req, res, next) => {
      const { projectId } = req.params;
      const project = await Projects.findIfExists(projectId);
      if (!project) {
        throw new NotFoundError(`project ${projectId} not found`);
      }
      setLocalsProject(res, project);
      next();
    }
  );

  router.get<
    undefined,
    | ApiGetRequestResponse<"/v1/projects/{projectId}", 200>
    | ApiGetRequestResponse<"/v1/projects/{projectId}", 404>
  >("/v1/projects/:projectId", async (req, res, next) => {
    const project = readLocalsProject(res);
    res.status(200).json(project);
  });

  router.use(projectAppsRouter());

  router.get<
    undefined,
    ApiGetRequestResponse<"/v1/projects/{projectId}/domains", 200>
  >("/v1/projects/:projectId/domains", async (req, res, next) => {
    const project = readLocalsProject(res);
    const domains = await Domains.list(project.id);
    res.status(200).json(domains);
  });

  router.post<
    undefined,
    ApiPostRequestResponse<"/v1/projects/{projectId}/domains", 201>,
    ApiPostRequestPayload<"/v1/projects/{projectId}/domains">
  >("/v1/projects/:projectId/domains", async (req, res, next) => {
    const project = readLocalsProject(res);
    const domain = await Domains.create(project.id, {
      hostname: req.body.hostname,
      path: req.body.path,
      appId: req.body.appId,
      appServiceTargetId: req.body.appServiceTargetId,
      targetPort: req.body.targetPort,
    });
    return res.status(201).json(domain);
  });

  router.get<
    undefined,
    ApiGetRequestResponse<"/v1/projects/{projectId}/files", 200>
  >("/v1/projects/:projectId/files", async (req, res, next) => {
    const project = readLocalsProject(res);
    const files = await Files.list(project.id);
    res.status(200).json(files);
  });

  router.post<
    undefined,
    ApiPostRequestResponse<"/v1/projects/{projectId}/files", 201>,
    ApiPostRequestPayload<"/v1/projects/{projectId}/files">
  >("/v1/projects/:projectId/files", async (req, res, next) => {
    const project = readLocalsProject(res);
    const file = await Files.create(project.id, {
      name: req.body.name,
      isSecret: req.body.isSecret,
      content: req.body.content,
    });
    return res.status(201).json(file);
  });

  router.get<
    undefined,
    ApiGetRequestResponse<"/v1/projects/{projectId}/files/linked-apps", 200>
  >("/v1/projects/:projectId/files/linked-apps", async (req, res, next) => {
    const project = readLocalsProject(res);
    const linkedApps = await Apps.getGroupedPerLinkedResourceId(
      "linked-file-id",
      project.id
    );
    res.status(200).json(linkedApps);
  });

  router.get<
    undefined,
    | ApiGetRequestResponse<"/v1/projects/{projectId}/metrics", 200>
    | ApiGetRequestResponse<"/v1/projects/{projectId}/metrics", 503>
  >("/v1/projects/:projectId/metrics", async (req, res, next) => {
    const project = readLocalsProject(res);
    const [appChartsById, apps, podMetrics] = await Promise.all([
      AppCharts.list().then((appCharts) =>
        appCharts.reduce<Record<string, components["schemas"]["AppChart"]>>(
          (obj, appChart) => {
            return {
              ...obj,
              [appChart.id]: appChart,
            };
          },
          {}
        )
      ),
      Apps.list(project.id),
      getPodsTop(project.id).catch<null>((error) => {
        log.info({ message: "request to Metrics Server failed", error });
        return null;
      }),
    ]);
    if (podMetrics === null) {
      return res.status(503).json({});
    }
    const bytesToMbString = (bytes: number | BigInt): string => {
      return (Number(bytes) / 1000000).toFixed(2);
    };
    const cpuToCpuString = (cpu: number | BigInt): string => {
      return Number(cpu).toFixed(2);
    };

    const appsWithMetricsTargets = apps
      .map((app) => {
        const appChart = appChartsById[app.appChartId];
        if (!appChart) {
          throw new Error("did not find app chart");
        }
        const { metricsTargets } = appChart.spec;
        if (metricsTargets.length !== 1) {
          return null;
        }
        const metricsTarget = metricsTargets[0];
        return { app, metricsTarget };
      })
      .filter((item) => item !== null);

    const metrics = appsWithMetricsTargets.map<
      ApiGetRequestResponse<"/v1/projects/{projectId}/metrics", 200>[number]
    >(({ app, metricsTarget }) => {
      const pods = podMetrics.filter(
        (item) =>
          item.Pod.metadata.labels[
            `ext.shipmight.com/metrics-target.${metricsTarget.id}`
          ] === app.id
      );
      return {
        app: {
          name: app.name,
        },
        pods: pods.map((pod) => {
          return {
            id: pod.Pod.metadata.name,
            containerAmount: pod.Containers.length,
            memoryUsageMb: bytesToMbString(pod.Memory.CurrentUsage),
            memoryLimitMb: bytesToMbString(pod.Memory.LimitTotal),
            cpuUsage: cpuToCpuString(pod.CPU.CurrentUsage),
            cpuLimit: cpuToCpuString(pod.CPU.LimitTotal),
          };
        }),
      };
    });
    res.status(200).json(metrics);
  });

  router.get<
    paths["/v1/projects/{projectId}/logs"]["parameters"]["path"],
    ApiGetRequestResponse<"/v1/projects/{projectId}/logs", 200> | string,
    undefined,
    paths["/v1/projects/{projectId}/logs"]["parameters"]["query"]
  >("/v1/projects/:projectId/logs", async (req, res, next) => {
    const project = readLocalsProject(res);
    const sources = await getProjectLogSources(project.id);
    const logParams = await parseLogParams(req.query, sources);
    const logs = await getLogs(logParams);
    serveLogsResponse(res, logParams, logs);
  });

  router.get<
    paths["/v1/projects/{projectId}/logs/sources"]["parameters"]["path"],
    ApiGetRequestResponse<"/v1/projects/{projectId}/logs/sources", 200>
  >("/v1/projects/:projectId/logs/sources", async (req, res, next) => {
    const project = readLocalsProject(res);
    const sources = await getProjectLogSources(project.id);
    res.status(200).json(sources.map(({ id, name }) => ({ id, name })));
  });

  // /v1/domains/:domainId

  router.use<paths["/v1/domains/{domainId}"]["parameters"]["path"]>(
    "/v1/domains/:domainId",
    async (req, res, next) => {
      const { domainId } = req.params;
      const domain = await Domains.findIfExists(domainId);
      if (!domain) {
        throw new NotFoundError(`domain ${domainId} not found`);
      }
      setLocalsDomain(res, domain);
      next();
    }
  );

  router.post<
    undefined,
    ApiPostRequestResponse<"/v1/domains/{domainId}", 200>,
    ApiPostRequestPayload<"/v1/domains/{domainId}">
  >("/v1/domains/:domainId", async (req, res, next) => {
    const domain = readLocalsDomain(res);
    const newDomain = await Domains.update(domain.id, req.body);
    res.status(200).json(newDomain);
  });

  router.delete<
    undefined,
    ApiDeleteRequestResponse<"/v1/domains/{domainId}", 204>
  >("/v1/domains/:domainId", async (req, res, next) => {
    const domain = readLocalsDomain(res);
    await Domains.delete(domain.id);
    res.status(204).json();
  });

  // /v1/files/:fileId

  router.use<paths["/v1/files/{fileId}"]["parameters"]["path"]>(
    "/v1/files/:fileId",
    async (req, res, next) => {
      const { fileId } = req.params;
      const file = await Files.findIfExists(fileId);
      if (!file) {
        throw new NotFoundError(`file ${fileId} not found`);
      }
      setLocalsFile(res, file);
      next();
    }
  );

  router.get<
    undefined,
    | ApiGetRequestResponse<"/v1/files/{fileId}", 200>
    | ApiGetRequestResponse<"/v1/files/{fileId}", 404>
  >("/v1/files/:fileId", async (req, res, next) => {
    const file = readLocalsFile(res);
    res.status(200).json(file);
  });

  router.post<
    undefined,
    ApiPostRequestResponse<"/v1/files/{fileId}", 200>,
    ApiPostRequestPayload<"/v1/files/{fileId}">
  >("/v1/files/:fileId", async (req, res, next) => {
    const file = readLocalsFile(res);
    const newFile = await Files.update(file.id, req.body);
    res.status(200).json(newFile);
  });

  router.delete<undefined, ApiDeleteRequestResponse<"/v1/files/{fileId}", 204>>(
    "/v1/files/:fileId",
    async (req, res, next) => {
      const file = readLocalsFile(res);
      await Files.delete(file.id);
      res.status(204).json();
    }
  );

  // /v1/apps/:appId

  router.use<paths["/v1/apps/{appId}"]["parameters"]["path"]>(
    "/v1/apps/:appId",
    async (req, res, next) => {
      const { appId } = req.params;
      const app = await Apps.findIfExists(appId);
      if (!app) {
        throw new NotFoundError(`app ${appId} not found`);
      }
      setLocalsApp(res, app);
      next();
    }
  );

  router.get<
    undefined,
    | ApiGetRequestResponse<"/v1/apps/{appId}", 200>
    | ApiGetRequestResponse<"/v1/apps/{appId}", 404>
  >("/v1/apps/:appId", async (req, res, next) => {
    const app = readLocalsApp(res);
    res.status(200).json(app);
  });

  router.post<
    undefined,
    ApiPostRequestResponse<"/v1/apps/{appId}", 200>,
    ApiPostRequestPayload<"/v1/apps/{appId}">
  >("/v1/apps/:appId", async (req, res, next) => {
    const app = readLocalsApp(res);
    const newApp = await Apps.update(app.id, req.body);
    res.status(200).json(newApp);
  });

  router.delete<undefined, ApiDeleteRequestResponse<"/v1/apps/{appId}", 204>>(
    "/v1/apps/:appId",
    async (req, res, next) => {
      const requestId = readLocalsRequestId(res);
      const app = readLocalsApp(res);
      await queue.schedule({
        taskType: "uninstallApp",
        projectId: app.projectId,
        appId: app.id,
        requestId,
      });
      await DeployHooks.deleteForApp(app.id);
      await Apps.delete(app.id);
      res.status(204).json();
    }
  );

  router.use(appDeploymentsRouter());

  router.use(appReleasesRouter());

  router.use(appRunsRouter());

  router.get<
    undefined,
    ApiGetRequestResponse<"/v1/apps/{appId}/deploy-hooks", 200>
  >("/v1/apps/:appId/deploy-hooks", async (req, res, next) => {
    const app = readLocalsApp(res);
    const deployHooks = await DeployHooks.list(app.id);
    res.status(200).json(deployHooks);
  });

  router.post<
    undefined,
    ApiPostRequestResponse<"/v1/apps/{appId}/deploy-hooks", 201>,
    ApiPostRequestPayload<"/v1/apps/{appId}/deploy-hooks">
  >("/v1/apps/:appId/deploy-hooks", async (req, res, next) => {
    const app = readLocalsApp(res);
    const deployHook = await DeployHooks.create({
      projectId: app.projectId,
      appId: app.id,
      name: req.body.name,
    });
    const token = await DeployHooks.getToken(deployHook.id);
    res.status(201).json({
      ...deployHook,
      token,
    });
  });

  router.get<undefined, ApiGetRequestResponse<"/v1/apps/{appId}/domains", 200>>(
    "/v1/apps/:appId/domains",
    async (req, res, next) => {
      const app = readLocalsApp(res);
      const domains = await Domains.list(app.projectId, app.id);
      res.status(200).json(domains);
    }
  );

  router.get<
    undefined,
    ApiGetRequestResponse<"/v1/apps/{appId}/logs", 200>,
    undefined,
    paths["/v1/apps/{appId}/logs"]["parameters"]["query"]
  >("/v1/apps/:appId/logs", async (req, res, next) => {
    const app = readLocalsApp(res);
    const { logTargetId } = req.query;
    const appChart = await AppCharts.find(app.appChartId);
    const logTarget = appChart.spec.logTargets.find(
      (item) => item.id === logTargetId
    );
    if (!logTarget) {
      throw new NotFoundError("unknown logTargetId");
    }
    const msToNs = (ms: number): number => ms * 1000000;
    const intervalNs = msToNs(60 * 60 * 24 * 1000);
    const endNs = msToNs(Date.now());
    const startNs = endNs - intervalNs;
    const { logs } = await getLokiLogs(
      toSingleStreamLogQl({
        [`ext.shipmight.com/log-target.${logTarget.id}`]: app.id,
      }),
      startNs.toString(),
      endNs.toString()
    );
    res.status(200).json(logs);
  });

  // /v1/deploy-hooks/:deployHookId

  router.use(deployHooksRouter());

  // /system-logs/:category

  router.get<
    paths["/v1/system-logs/{category}"]["parameters"]["path"],
    ApiGetRequestResponse<"/v1/system-logs/{category}", 200> | string,
    undefined,
    paths["/v1/system-logs/{category}"]["parameters"]["query"]
  >("/v1/system-logs/:category", async (req, res, next) => {
    const { category } = req.params;
    const sources = await getSystemLogSources(category);
    const logParams = await parseLogParams(req.query, sources);
    const logs = await getLogs(logParams);
    serveLogsResponse(res, logParams, logs);
  });

  router.get<
    paths["/v1/system-logs/{category}/sources"]["parameters"]["path"],
    ApiGetRequestResponse<"/v1/system-logs/{category}/sources", 200>
  >("/v1/system-logs/:category/sources", async (req, res, next) => {
    const { category } = req.params;
    const sources = await getSystemLogSources(category);
    res.status(200).json(sources.map(({ id, name }) => ({ id, name })));
  });

  // 404, errors

  router.use(() => {
    // Note that this handler is not reached if the requested endpoint is
    // missing from OpenAPI spec, because in that case
    // express-openapi-validator has already thrown an error earlier
    throw new NotFoundError("no request handler for this endpoint");
  });

  const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    const requestId = readLocalsRequestId(res);

    if (
      err instanceof OpenApiValidator.error.BadRequest ||
      err instanceof ValidationError
    ) {
      const body: components["responses"]["ValidationError"]["content"]["application/json"] =
        {
          error: {
            name: err.name,
            message: err.message,
            errors:
              err instanceof ValidationError
                ? err.errors.map((item) => {
                    return {
                      path: item.instancePath,
                      message: item.message,
                    };
                  })
                : err.errors.map((item) => {
                    return {
                      path: item.path,
                      message: item.message,
                    };
                  }),
          },
          requestId,
        };
      return res.status(400).json(body);
    }

    if (err instanceof AuthorizationError) {
      log.error({
        message: "authorization error",
        error: err,
        requestId,
      });
      const body: components["responses"]["AuthorizationError"]["content"]["application/json"] =
        {
          error: {
            name: err.name,
            message: err.message,
          },
          requestId,
        };
      return res.status(401).json(body);
    }

    const isOpenApiError =
      err instanceof OpenApiValidator.error.NotFound ||
      err instanceof OpenApiValidator.error.MethodNotAllowed;
    if (err instanceof NotFoundError || isOpenApiError) {
      if (isOpenApiError) {
        log.error({
          message: "endpoint not specified in OpenAPI schema",
          error: err,
          requestId,
        });
      }
      const body: components["responses"]["NotFoundError"]["content"]["application/json"] =
        {
          error: {
            name: "NotFoundError",
            message: `endpoint ${req.method} ${req.originalUrl} not found`,
          },
          requestId,
        };
      return res.status(404).json(body);
    }

    log.error({ requestId, error: err });
    const body: components["responses"]["ServerError"]["content"]["application/json"] =
      {
        error: {
          name: "ServerError",
          message: "An unknown error occurred",
        },
        requestId,
      };
    return res.status(500).json(body);
  };
  router.use(errorHandler);

  const app = express();
  app.use(router);
  return app;
}
