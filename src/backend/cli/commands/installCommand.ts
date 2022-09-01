import AppCharts from "../../api/models/AppCharts";
import Projects from "../../api/models/Projects";
import Registries from "../../api/models/Registries";
import Users from "../../api/models/Users";
import { releaseUpgradeLock } from "../../api/services/upgradeLock";
import env from "../../utils/env";
import { kubeReadyz } from "../../utils/kubernetes";
import { getLogger } from "../../utils/logging";

const log = getLogger("cli:commands:install");

export default async function installCommand() {
  try {
    log.info("starting install");

    log.info("checking kubernetes API availability");
    await kubeReadyz();

    const registries = await Registries.list();
    if (!registries.length) {
      log.info("no registries found, creating default registries");
      await Registries.create({
        name: "Docker Hub",
        url: "docker.io",
        authToken: "",
      });
      log.info("created Docker Hub registry");
    }

    const installedAppCharts = await AppCharts.list();
    const defaultAppCharts: Parameters<typeof AppCharts["create"]>[0][] = [
      {
        id: "applications",
        chart: {
          internalChartName: "application",
        },
      },
      {
        id: "jobs",
        chart: {
          internalChartName: "job",
        },
      },
    ];
    log.info("creating or updating default appCharts");
    for (const appChart of defaultAppCharts) {
      const existingAppChart = installedAppCharts.find(
        (installedAppChart) => installedAppChart.id === appChart.id
      );
      if (existingAppChart) {
        log.info(`deleting old appChart ${appChart.id}`);
        await AppCharts.delete(appChart.id);
      }
      log.info(`creating appChart ${appChart.id}`);
      await AppCharts.create(appChart);
    }
    log.info("created default appCharts");

    const projects = await Projects.list();
    if (!projects.length) {
      log.info("no projects found, creating default project");
      await Projects.create({
        name: "Default Project",
      });
      log.info("created default project");
    }

    const users = await Users.list();
    if (!users.length && env.initialAdminUser && env.initialAdminPass) {
      log.info("no users found, creating initial admin user");
      await Users.create({
        username: env.initialAdminUser,
        password: env.initialAdminPass,
        mustChangePassword: true,
      });
      log.info("created admin user");
    }

    log.info("releasing upgrade lock if exists");
    await releaseUpgradeLock();

    log.info("install finished");
  } catch (error) {
    log.error({ error });
  }
}
