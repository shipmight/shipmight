import uiServer from "../../ui/uiServer";
import env from "../../utils/env";
import { getLogger } from "../../utils/logging";

const log = getLogger("cli:commands:ui");

export default async function uiCommand() {
  try {
    const basePath = env.uiIngressPath;
    const app = uiServer({ basePath });

    app.listen(env.uiPort, () => {
      log.info(`listening at ${env.uiPort}`);
    });
  } catch (error) {
    log.error({ error });
  }
}
