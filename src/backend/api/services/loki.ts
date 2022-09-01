import request, { CoreOptions, Response } from "request";
import { format } from "date-fns";
import env from "../../utils/env";
import { getLogger } from "../../utils/logging";
import { randomCharacters } from "../../utils/crypto";

const log = getLogger("api:loki");

//
// Configuration
//

export const isLokiInstalled = (): boolean => {
  return env.lokiEndpoint !== "";
};

//
// HTTP client
//

const client = request.defaults({
  baseUrl: env.lokiEndpoint,
  json: true,
});

function lokiRequest(url: string, options?: CoreOptions): Promise<Response> {
  return new Promise((resolve, reject) => {
    client(url, options, (err, response) => {
      if (err) {
        return reject(err);
      }
      resolve(response);
    });
  });
}

//
// Memoized Loki limits
//

// Read limits from Loki config once, from then on use memoized values

interface LokiLimits {
  maxQueryLengthNs: string;
  queryResultsMax: number;
}

let lokiLimits: LokiLimits;

const secondsToNs = (seconds: number) => `${seconds}000000000`;

export const parseLokiLimitsFromConfigText = (
  configText: string
): LokiLimits => {
  const limits: LokiLimits = {
    maxQueryLengthNs: secondsToNs(721 * 60 * 60),
    queryResultsMax: 5000,
  };

  const queryResultsMaxMatch = configText.match(
    /max_entries_limit_per_query: (\d+)/
  );
  if (queryResultsMaxMatch && !isNaN(parseInt(queryResultsMaxMatch[1]))) {
    limits.queryResultsMax = parseInt(queryResultsMaxMatch[1]);
  }

  const maxQueryLengthNsMatch = configText.match(
    /max_query_length: (\d+)d(\d+)h/
  );
  if (
    maxQueryLengthNsMatch &&
    !isNaN(parseInt(maxQueryLengthNsMatch[1])) &&
    !isNaN(parseInt(maxQueryLengthNsMatch[2]))
  ) {
    limits.maxQueryLengthNs = secondsToNs(
      (parseInt(maxQueryLengthNsMatch[1]) * 24 +
        parseInt(maxQueryLengthNsMatch[2])) *
        60 *
        60
    );
  }

  return limits;
};

export const getLokiLimits = async (): Promise<typeof lokiLimits> => {
  if (lokiLimits) {
    return lokiLimits;
  }

  try {
    const configText = await lokiRequest("/config");
    lokiLimits = parseLokiLimitsFromConfigText(configText.body);
  } catch (error) {
    lokiLimits = parseLokiLimitsFromConfigText("");
    log.error({
      message:
        "reading limits from loki config failed, falling back to defaults",
      error,
    });
  }

  log.info({ message: "loki limits memoed", ...lokiLimits });

  return lokiLimits;
};

//
// Fetching logs
//

interface LokiQueryResponse {
  status: "success" | string;
  data: {
    resultType: "vector" | "streams";
    result: {
      stream: { [key: string]: string };
      values: [string, string][];
    }[];
    stats: unknown;
  };
}

// This is a simple label conversion
export const toSingleStreamLogQl = (obj: Record<string, string>): string => {
  const labels = Object.keys(obj).map(
    (key) => `${key}=${JSON.stringify(obj[key])}`
  );
  return `{${labels.join(",")}}`;
};

// TODO this is not a thing
export const toMultiStreamLogQl = (singleStreamLogQl: string[]): string => {
  return singleStreamLogQl.join("");
};

export const combineLogStreams = (
  streams: Pick<LokiQueryResponse["data"]["result"][number], "values">[]
): [string, string][] => {
  // Streams come in sorted in descending order
  // This function returns them combined, also in descending order

  // This may be one of those seldom occasions where careful performance optimization
  // will actually come in handy at some point.

  const logs: [string, string][] = []
    .concat(...streams.map<[string, string][]>(({ values }) => values))
    .sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return logs;
};

const formatDatetimes = (logs: [string, string][]): [string, string][] => {
  return logs.map(([ns, text]) => {
    const date = new Date(parseInt(ns.slice(0, -6)));
    const datetime = format(date, "yyyy-MM-dd kk:mm:ss.SSS");
    return [datetime, text];
  });
};

const queryLogs = async (
  qs: {
    query: string;
    direction: "forward" | "backward";
    start: string;
    end: string;
    limit: number;
  },
  lokiReqId: string
): Promise<[string, string][]> => {
  const req = await lokiRequest("loki/api/v1/query_range", {
    qs,
  });
  const data: LokiQueryResponse = req.body;
  if (data.status !== "success") {
    log.error({ message: "loki responded with non-success", lokiReqId, data });
    throw new Error("loki request responded with non-success");
  }

  const logs: [string, string][] = []
    .concat(...data.data.result.map<[string, string][]>(({ values }) => values))
    .sort((a, b) => (a[0] > b[0] ? 1 : -1));

  return logs;
};

export const getLokiLogs = async (
  logQl: string,
  startNs: string,
  endNs: string
): Promise<{
  logs: [string, string][];
  firstNs?: string;
  lastNs?: string;
}> => {
  const lokiReqId = randomCharacters(5);
  log.info({
    message: "making loki request",
    lokiReqId,
    logQl,
    startNs,
    endNs,
  });

  const req = await lokiRequest("loki/api/v1/query_range", {
    qs: {
      query: logQl,
      direction: "forward",
      start: startNs,
      end: endNs,
      limit: 1000,
    },
  });
  const data: LokiQueryResponse = req.body;
  if (data.status !== "success") {
    log.error({ message: "loki responded with non-success", lokiReqId, data });
    throw new Error("loki request responded with non-success");
  }
  const all = combineLogStreams(data.data.result);
  const logs = formatDatetimes(all);
  const firstNs = all.length ? all[0][0] : undefined;
  const lastNs = all.length ? all[all.length - 1][0] : undefined;
  log.info({
    message: "loki returned logs",
    logAmount: logs.length,
    lastNs,
    lokiReqId,
  });
  return { logs, firstNs, lastNs };
};

export const getLokiLogs2 = async (
  sources: { name: string; logQl: string }[],
  params: {
    startNs: string;
    endNs: string;
    limit: number;
  },
  lib: {
    queryLogs: typeof queryLogs;
    getLokiLimits: typeof getLokiLimits;
  } = {
    queryLogs,
    getLokiLimits,
  }
): Promise<[string, string, string][]> => {
  const lokiReqId = randomCharacters(5);
  log.info({
    message: "getting loki logs",
    lokiReqId,
    ...params,
  });

  const limits = await lib.getLokiLimits();

  let direction: "forward" | "backward" = "forward";
  if (params.startNs > params.endNs) {
    direction = "backward";
  }

  const limit = Math.max(1, Math.min(10000, params.limit));

  // TODO this fetches up to params.limit for each source… those are all
  // put into array which is sliced to max params.limit eventually. So currently
  // possibly fetching way more than needed. More intelligent solution could be used.

  const bigIntMax = (value1: bigint, value2: bigint) =>
    value1 > value2 ? value1 : value2;
  const bigIntMin = (value1: bigint, value2: bigint) =>
    value1 < value2 ? value1 : value2;

  const logLists = await Promise.all(
    sources.map(async (source) => {
      let sourceLogs: [string, string, string][] = [];

      let start: string;
      let end: string;
      if (direction === "forward") {
        start = params.startNs;
        end = bigIntMin(
          BigInt(start) + BigInt(limits.maxQueryLengthNs),
          BigInt(params.endNs)
        ).toString();
      } else {
        end = params.startNs;
        start = bigIntMax(
          BigInt(end) - BigInt(limits.maxQueryLengthNs),
          BigInt(params.endNs)
        ).toString();
      }

      const maxRequests = 10;
      let requestCounter = 0;

      while (sourceLogs.length < limit) {
        if (BigInt(end) - BigInt(start) <= 0) {
          break;
        }

        const logs = await lib.queryLogs(
          {
            query: source.logQl,
            direction,
            start,
            end,
            limit: limits.queryResultsMax,
          },
          lokiReqId
        );

        if (logs.length) {
          if (direction === "forward") {
            const newestNs = logs[logs.length - 1][0];
            start = (BigInt(newestNs) + BigInt(1)).toString();
            end = bigIntMin(
              BigInt(start) + BigInt(limits.maxQueryLengthNs),
              BigInt(params.endNs)
            ).toString();
          } else {
            const oldestNs = logs[0][0];
            end = (BigInt(oldestNs) - BigInt(1)).toString();
            start = bigIntMax(
              BigInt(end) - BigInt(limits.maxQueryLengthNs),
              BigInt(params.endNs)
            ).toString();
          }
        } else {
          if (direction === "forward") {
            start = end;
            end = bigIntMin(
              BigInt(start) + BigInt(limits.maxQueryLengthNs),
              BigInt(params.endNs)
            ).toString();
          } else {
            end = start;
            start = bigIntMax(
              BigInt(end) - BigInt(limits.maxQueryLengthNs),
              BigInt(params.endNs)
            ).toString();
          }
        }

        const namedLogs = logs.map<[string, string, string]>(([ns, text]) => [
          ns,
          source.name,
          text,
        ]);

        sourceLogs = [...namedLogs, ...sourceLogs];

        requestCounter += 1;
        if (requestCounter === maxRequests) {
          throw new Error(
            `reached max request count of ${maxRequests} for source ${source.name}`
          );
        }
      }

      return sourceLogs;
    })
  );

  const allLogs = logLists
    .flatMap((arr) => arr)
    .sort((a, b) => (a[0] > b[0] ? 1 : -1));

  return direction === "forward"
    ? allLogs.slice(0, limit)
    : allLogs.slice(-limit);
};
