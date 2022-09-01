import apiServer from "../../api/apiServer";
import queue from "../../api/queue";
import work from "../../api/worker/work";
import env from "../../utils/env";
import { getLogger } from "../../utils/logging";

const log = getLogger("cli:commands:api");

export default async function apiCommand() {
  try {
    const app = apiServer();

    app.listen(env.apiPort, () => {
      log.info(`listening at ${env.apiPort}`);
    });

    queue.consume(async (task) => {
      try {
        await work(task);
      } catch (error) {
        log.error({ error, requestId: task.requestId });
      }
    });
  } catch (error) {
    log.error({ error });
  }
}
