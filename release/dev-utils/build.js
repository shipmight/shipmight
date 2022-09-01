/* eslint-disable @typescript-eslint/no-var-requires */

// Ermagerd, typical dev behaviour to write a custom solution instead of
// relying on battle-tested tools...
//
// Yep! I wouldn't have committed this if it didn't actually work well.
// If it causes issues later, shall switch to webpack + dozens of other
// tools, or something.
//
// But, the reason this is here is that existing tooling did not fit very
// well to our requirements:
//   1. one bundle for the browser
//   2. one source for server code, which should restart the CLI upon changes
// Using existing tooling would've involved running multiple processes to
// handle these requirements. E.g. webpack bundling both and nodemon restarting
// the CLI process. Setting up webpack with `target: node` was a pain and I
// just kept getting warnings and errors. Plus, there's no need to bundle the
// server code into one file; it's actually not desirable. So, could run `babel
// --watch` for the server code but then we'd have 3 separate processes. Not to
// mention all the different configuration files and mapping them to each
// process/command.
//
// Developing Shipmight locally is already heavy due to running kubernetes.
// Having this custom script makes it easier to keep the build pipeline as
// light as possible.
//
// I find this build.js file to be quite neat and easily controlled, and if it
// works well in the future, I see no reason to switch away. I wanted to use
// gulp actually, but sadly it is not suitable for production at this time (it
// breaks in node 14+ due to chokidar dependency.)
//
// Why am I writing such a long comment..? I don't know. I hope that this
// project is some day popular enough that other people than me are working on
// it, and at that point it should be valuable. Thanks for reading!

// The minimum requirements of a build pipeline:
//   1. It should build the production version of the codebase
//   2. It should watch for changes and build the development version of the codebase
//   3. It should break from errors in production and notify about them in development
//
// Additional requirements (nice-to-haves):
//   - It should be lightweight
//   - It should make developers' life easier
//   - It should discourage adding complexity

const rimraf = require("rimraf");
const fs = require("fs");
const childProcess = require("child_process");
const path = require("path");
const esbuild = require("esbuild");
const chokidar = require("chokidar");
const openapiToTs = require("openapi-typescript").default;

const magenta = (text) => `\x1b[1;35m${text}\x1b[0m`;
const log = (...args) => console.error(magenta(">>"), ...args);

//
// Global configuration
//

const srcDir = path.join(__dirname, "../../src");
const destDir = path.join(__dirname, "../../dist");

const watchMode = process.argv.includes("--watch");
const checkMode = process.argv.includes("--check");

const versionDefines = {
  "process.env.SHIPMIGHT_VERSION": JSON.stringify(
    process.env.SHIPMIGHT_VERSION || "0.0.0"
  ),
  "process.env.SHIPMIGHT_COMMIT": JSON.stringify(
    process.env.SHIPMIGHT_COMMIT || "unknown"
  ),
};

const licenseDefines = {
  "process.env.LICENSE_TEXT": JSON.stringify(
    fs.readFileSync(`${__dirname}/../../LICENSE`, "utf-8")
  ),
};

//
// CLI
//

const cliOptions = {
  entryPoints: [`${srcDir}/backend/cli/cli.ts`],
  write: true,
  outdir: `${destDir}/backend/cli`,
  target: ["node14"],
  bundle: true,
  sourcemap: true,
  platform: "node",
  define: {
    ...versionDefines,
  },
  // Don't include any npm dependencies in the bundle
  external: Object.keys(require("../../package.json").dependencies),
};

const cliCommand = [
  "node",
  [
    "-r",
    "source-map-support/register",
    `${cliOptions.outdir}/cli.js`,
    "--install",
    "--ui",
    "--api",
  ],
];

let cliProcess;

function _runCli() {
  if (cliProcess) {
    cliProcess.kill();
  }
  log("[build:cli] spawning cli");
  cliProcess = childProcess.spawn(...cliCommand, {
    stdio: ["pipe", "inherit", "inherit"],
  });
}

async function buildCli() {
  log("[build:cli] starting build");
  await esbuild.build({ ...cliOptions });
  log("[build:cli] build done");
}

async function watchCli() {
  log("[build:cli] starting watch");
  await esbuild.build({ ...cliOptions });
  _runCli();
  await esbuild.build({
    ...cliOptions,
    watch: {
      onRebuild: (error) => {
        if (error) {
          log("[build:cli] error: ", error);
          return;
        }
        log("[build:cli] recompiled");
        _runCli();
      },
    },
  });
}

//
// OpenAPI
//

const openApiEntry = `${srcDir}/backend/api/apiSchema.json`;
const openApiDest = `${srcDir}/backend/api/generated/apiSchema.ts`;

async function _getOpenApiTs() {
  const schema = JSON.parse(fs.readFileSync(openApiEntry, "utf-8"));
  const ts = await openapiToTs(schema);
  return ts;
}

async function _buildOpenApi() {
  const ts = await _getOpenApiTs();
  fs.writeFileSync(openApiDest, ts);
}

async function buildOpenApi() {
  log("[build:openApi] starting build");
  try {
    await _buildOpenApi();
  } catch (error) {
    log("[build:openApi] error: ", error);
  }
  log("[build:openApi] build done");
}

async function watchOpenApi() {
  log("[build:openApi] starting watch");
  chokidar
    .watch(openApiEntry)
    .on("add", buildOpenApi)
    .on("change", buildOpenApi);
}

async function checkOpenApi() {
  log("[build:openApi] checking");
  const ts = await _getOpenApiTs();
  const currentVersion = fs.readFileSync(openApiDest, "utf-8");
  if (ts !== currentVersion) {
    throw new Error(
      `[openApi] ${openApiEntry} has changed after ${openApiDest} was last generated. Please regenerate it via 'yarn dev'.`
    );
  }
  log("[build:openApi] check done");
}

//
// Static
//

const staticEntry = `${srcDir}/frontend/static`;
const staticDest = `${destDir}/frontend/static`;

async function copyStaticFile(file) {
  const relativePath = file.replace(staticEntry, "").replace(/^\//, "");
  log(`[build:static] copying file ${relativePath}`);
  const source = `${staticEntry}/${relativePath}`;
  const destination = `${staticDest}/${relativePath}`;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

async function buildStatic() {
  log("[build:static] starting copying");
  const watcher = chokidar
    .watch(`${staticEntry}/**/*`)
    .on("add", copyStaticFile)
    .on("ready", async () => {
      await watcher.close();
      log("[build:static] copying done");
    });
}

async function watchStatic() {
  log("[build:static] starting watch");
  chokidar
    .watch(`${staticEntry}/**/*`)
    .on("add", copyStaticFile)
    .on("change", copyStaticFile);
}

//
// UI
//

const uiOptions = {
  entryPoints: [`${srcDir}/frontend/ui/ui.tsx`],
  write: true,
  outdir: `${destDir}/frontend/ui`,
  target: ["es2020", "chrome58", "firefox57", "safari11", "edge18"],
  bundle: true,
  sourcemap: true,
  minify: true,
  define: {
    ...versionDefines,
    ...licenseDefines,
    // Workaround for the following fix which is not yet released:
    // https://github.com/scniro/react-codemirror2/pull/260
    global: "{}",
  },
};

async function buildUi() {
  log("[build:ui] starting build");
  await esbuild.build({ ...uiOptions });
  log("[build:ui] build done");
}

async function watchUi() {
  log("[build:ui] starting watch");
  await esbuild.build({
    ...uiOptions,
    watch: {
      onRebuild: (error) => {
        if (error) {
          log("[build:ui] error: ", error);
          return;
        }
        log("[build:ui] recompiled");
      },
    },
  });
}

//
// Internal charts
//

const internalChartEntry = `${srcDir}/internal-charts`;
const internalChartDest = `${destDir}/internal-charts`;
// When a file changes in these charts, they are reloaded as app charts into local Shipmight
const reloadInternalCharts = [
  { appChartId: "applications", internalChartName: "application" },
  { appChartId: "jobs", internalChartName: "job" },
];
let appChartReloadProcess;

async function reloadingAppChart({ appChartId, internalChartName }) {
  log(
    `[build:internalCharts] reloading appChart ${appChartId} from internal chart ${internalChartName}`
  );
  const cliCommand = [
    "node",
    [
      "-r",
      "source-map-support/register",
      `${cliOptions.outdir}/cli.js`,
      "manage",
      "reload-app-chart",
      appChartId,
      internalChartName,
    ],
  ];
  if (appChartReloadProcess) {
    appChartReloadProcess.kill();
  }
  appChartReloadProcess = childProcess.spawn(...cliCommand, {
    stdio: ["pipe", "inherit", "inherit"],
  });
}

async function copyInternalChartFile(file) {
  const relativePath = file.replace(internalChartEntry, "").replace(/^\//, "");
  log(`[build:internalChart] copying file ${relativePath}`);
  const source = `${internalChartEntry}/${relativePath}`;
  const destination = `${internalChartDest}/${relativePath}`;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  const chartName = relativePath.split("/", 1)[0];
  const reloadInfo = reloadInternalCharts.find(
    (item) => item.internalChartName === chartName
  );
  if (reloadInfo && watchMode) {
    reloadingAppChart(reloadInfo);
  }
}

async function buildInternalCharts() {
  log("[build:internalChart] starting copying");
  const watcher = chokidar
    .watch(`${internalChartEntry}/**/*`)
    .on("add", copyInternalChartFile)
    .on("ready", async () => {
      await watcher.close();
      log("[build:internalChart] copying done");
    });
}

async function watchInternalCharts() {
  log("[build:internalChart] starting watch");
  chokidar
    .watch(`${internalChartEntry}/**/*`)
    .on("add", copyInternalChartFile)
    .on("change", copyInternalChartFile);
}

//
// Port forwards to minikube cluster
//

const portForwards = [
  // {
  //   namespace: "shipmight",
  //   pod: "service/shipmight-grafana",
  //   localPort: 7000,
  //   podPort: 80,
  // },
  {
    namespace: "shipmight",
    pod: "service/shipmight-loki",
    localPort: 7001,
    podPort: 3100,
  },
];

const portForwardProcesses = [];

async function watchPortForwards() {
  log("[build:portForwards] starting watch");
  // kubectl port-forward service/shipmight-grafana 7000:80 -n shipmight
  for (let i = 0; i < portForwards.length; i++) {
    if (portForwardProcesses[i]) {
      portForwardProcesses[i].kill();
    }
    const { namespace, pod, localPort, podPort } = portForwards[i];
    const args = [
      "port-forward",
      "-n",
      namespace,
      pod,
      `${localPort}:${podPort}`,
    ];
    log(`[build:portForwards] running: ${args.toString()}`);
    portForwardProcesses[i] = childProcess.spawn("kubectl", args, {
      stdio: ["ignore", "ignore", "ignore"],
    });
  }
}

//
// Main handler
//

async function main() {
  rimraf.sync(destDir);
  fs.mkdirSync(destDir, { recursive: true });

  if (watchMode) {
    watchCli();
    watchOpenApi();
    watchStatic();
    watchUi();
    watchInternalCharts();
    watchPortForwards();
    return;
  }

  if (checkMode) {
    await checkOpenApi();
    return;
  }

  await buildCli();
  await buildOpenApi();
  await buildStatic();
  await buildUi();
  await buildInternalCharts();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
