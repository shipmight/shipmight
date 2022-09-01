import path from "path";
import { spawn } from "./childProcess";
import fs from "fs";
import { dump } from "js-yaml";
import { components } from "../api/generated/apiSchema";

const internalChartsDir = path.join(__dirname, "../../internal-charts");

type HelmChart = components["schemas"]["HelmChart"];

export type HelmRelease = {
  namespace: string;
  releaseName: string;
  chart: HelmChart;
  values: Record<string, unknown>;
  version?: string;
};

export const readFilesFromChart = async (
  chart: HelmChart,
  files: string[]
): Promise<string[]> => {
  let chartDir: string;
  if ("internalChartName" in chart) {
    chartDir = `${internalChartsDir}/${chart.internalChartName}`;
  }

  if (!chartDir) {
    throw new Error("unsupported chart type for reading files");
  }

  const contents: string[] = await Promise.all(
    files.map(async (file) => {
      try {
        const filePath = path.join(chartDir, file);
        const content = await fs.promises.readFile(filePath, "utf-8");
        return content;
      } catch (error) {
        throw new Error(
          `reading file ${file} from chart failed, stack: ${error.stack}`
        );
      }
    })
  );

  return contents;
};

//
// Releases
//

export const helmInstallOrUpgrade = async (
  prefixArgs: string[],
  release: HelmRelease,
  options: { env?: Record<string, string>; historyMax?: number } = {}
): Promise<void> => {
  let chartName: string;
  if ("internalChartName" in release.chart) {
    chartName = `${internalChartsDir}/${release.chart.internalChartName}`;
  } else if ("installedChartName" in release.chart) {
    chartName = release.chart.installedChartName;
  }

  if (!chartName) {
    throw new Error("unsupported chart type for installing or upgrading");
  }

  const args: string[] = [
    ...prefixArgs,

    release.releaseName,
    chartName,

    "--namespace",
    release.namespace,

    "-f",
    "-", // stdin
  ];
  if (release.version) {
    args.push("--version", release.version);
  }
  if (options.historyMax) {
    args.push("--history-max", options.historyMax.toString());
  }
  const writeStdin = dump(release.values);
  await spawn("helm", args, {
    writeStdin,
    env: { ...process.env, ...options?.env },
  });
};

export const helmInstall = async (
  release: HelmRelease,
  options: { env?: Record<string, string>; historyMax?: number } = {}
): Promise<void> => {
  await helmInstallOrUpgrade(["install"], release, options);
};

export const helmUpgrade = async (
  release: HelmRelease,
  options: {
    install?: boolean;
    env?: Record<string, string>;
    historyMax?: number;
  } = {}
): Promise<void> => {
  await helmInstallOrUpgrade(
    ["upgrade", ...(options.install ? ["--install"] : [])],
    release,
    options
  );
};

export const helmUninstall = async (
  release: Pick<HelmRelease, "namespace" | "releaseName">,
  options: { env?: Record<string, string> } = {}
): Promise<void> => {
  const args: string[] = [
    "uninstall",

    release.releaseName,

    "--namespace",
    release.namespace,
  ];
  await spawn("helm", args, {
    env: { ...process.env, ...options.env },
  });
};

const helmReleaseStatuses = [
  "unknown",
  "deployed",
  "uninstalled",
  "superseded",
  "failed",
  "uninstalling",
  "pending-install",
  "pending-upgrade",
  "pending-rollback",
] as const;

type HelmReleaseStatus = typeof helmReleaseStatuses[number];

export const helmStatus = async (
  release: Pick<HelmRelease, "namespace" | "releaseName">
): Promise<HelmReleaseStatus> => {
  const args: string[] = [
    "status",

    release.releaseName,

    "--namespace",
    release.namespace,
  ];
  // We could've also passed `--output json` to helm. However that output is very large and includes
  // things like manifests and config. There's really no need to parse such gigantic JSON when we're
  // just interested in value that can be very simply parsed from the output.
  const { stdout } = await spawn("helm", args);
  const statusString = stdout.match(/STATUS: ([a-z-]+)\n/);
  if (statusString.length < 2) {
    throw new Error("could not parse status from helm output");
  }
  const statusText = statusString[1] as HelmReleaseStatus;
  if (!helmReleaseStatuses.includes(statusText)) {
    throw new Error("unexpected status value in helm output");
  }
  return statusText;
};

//
// Repositories
//

export const helmRepoAdd = async (
  name: string,
  url: string,
  options: { env?: Record<string, string> }
): Promise<void> => {
  const args: string[] = ["repo", "add", name, url];
  await spawn("helm", args, { env: options.env });
};
