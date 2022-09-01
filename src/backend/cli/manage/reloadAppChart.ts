import AppCharts from "../../api/models/AppCharts";
import { getLogger } from "../../utils/logging";

const log = getLogger("cli:manage:reloadAppChart");

export default async function reloadAppChart(
  appChartId: string,
  internalChartName: string
) {
  log.info({ message: "uninstalling", appChartId });
  try {
    await AppCharts.delete(appChartId);
  } catch (error) {
    log.info({ message: "uninstall failed, ignoring", error });
  }

  log.info({ message: "installing", appChartId, internalChartName });
  await AppCharts.create({
    id: appChartId,
    chart: {
      internalChartName,
    },
  });

  log.info("done");
}
