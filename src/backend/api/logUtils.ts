import { format } from "date-fns";
import { Response } from "express";
import { components } from "./generated/apiSchema";
import { getLokiLogs2, toSingleStreamLogQl } from "./services/loki";

export type LogSource = {
  id: string;
  name: string;
  labelQuery: Record<string, string>;
};

type LogParams = {
  sources: LogSource[];
  startTime: string;
  endTime: string;
  limit: number;
  outputFormat: components["parameters"]["GetLogsParamFormat"];
};

export const parseLogParams = async (
  query: {
    sources: components["parameters"]["GetLogsParamSources"];
    startTime: components["parameters"]["GetLogsParamStartTime"];
    endTime: components["parameters"]["GetLogsParamEndTime"];
    limit: components["parameters"]["GetLogsParamLimit"];
    format?: components["parameters"]["GetLogsParamFormat"];
  },
  validSources: LogSource[]
): Promise<LogParams> => {
  const { startTime, endTime } = query;
  const limit = Math.max(1, Math.min(10000, parseInt(query.limit)));
  const outputFormat = query.format || "json";
  const sources = validSources.filter((item) =>
    query.sources.split(",").includes(item.id)
  );
  return {
    sources,
    startTime,
    endTime,
    limit,
    outputFormat,
  };
};

export const getLogs = async (params: LogParams): Promise<string[][]> => {
  const logs = await getLokiLogs2(
    params.sources.map(({ name, labelQuery }) => ({
      name,
      logQl: toSingleStreamLogQl(labelQuery),
    })),
    { startNs: params.startTime, endNs: params.endTime, limit: params.limit }
  );
  const withDatetime = logs.map<[string, string, string, string]>(
    ([ns, sourceName, text]) => {
      const date = new Date(parseInt(ns.slice(0, -6)));
      const datetime = format(date, "yyyy-MM-dd kk:mm:ss.SSS");
      return [datetime, ns, sourceName, text];
    }
  );
  return withDatetime;
};

export const serveLogsResponse = (
  res: Response,
  { outputFormat, sources, startTime, endTime }: LogParams,
  logs: string[][]
): void => {
  if (outputFormat === "csv-download" || outputFormat === "ndjson-download") {
    const sourceNames = sources
      .map((item) =>
        item.name
          .toLowerCase()
          .replace(/[^a-z]/g, "")
          .trim()
      )
      .sort()
      .join("-")
      .slice(0, 40);
    const filename = `logs-${startTime}-${endTime}-${sourceNames}`;
    if (outputFormat === "csv-download") {
      res
        .status(200)
        .set("content-type", "text/csv")
        .set("content-disposition", `attachment; filename="${filename}.csv"`)
        .send(
          logs
            .map(([datetime, ns, sourceName, text]) =>
              [
                JSON.stringify(datetime),
                JSON.stringify(ns),
                JSON.stringify(sourceName),
                JSON.stringify(text),
              ].join(",")
            )
            .join("\n") + "\n"
        );
    } else if (outputFormat === "ndjson-download") {
      res
        .status(200)
        .set("content-type", "application/x-ndjson")
        .set("content-disposition", `attachment; filename="${filename}.ndjson"`)
        .send(
          logs
            .map(([datetime, ns, source, text]) =>
              JSON.stringify({ datetime, ns, source, text })
            )
            .join("\n") + "\n"
        );
    }
  } else {
    res.status(200).json(logs);
  }
};
