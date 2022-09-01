import tty from "tty";
import { Request, RequestHandler, Response } from "express";
import { LogProviderCallback } from "http-proxy-middleware/dist/types";
import responseTime from "response-time";
import env from "./env";

type LoggingSource =
  | `api:${string}`
  | `api:services:${string}`
  | `api:worker:${string}`
  | `cli:${string}`
  | `cli:commands:${string}`
  | `cli:manage:${string}`
  | `ui:${string}`
  | `utils:${string}`
  | `worker:${string}`;

const logFormat: "json" | "pretty" =
  env.logFormat === "pretty" ? "pretty" : "json";

const useColors = !env.noColor && tty.isatty(process.stderr.fd);
const colorize = useColors
  ? (ansiCode: string) => (text: string) => `${ansiCode}${text}\x1b[0m`
  : () => (text: string) => text;

const dim = colorize(`\x1b[2m`);
const red = colorize(`\x1b[31m`);
const blue = colorize(`\x1b[36m`);

const jsonReplacer = (key, value) => {
  if (value instanceof Error) {
    return Object.getOwnPropertyNames(value).reduce(
      (obj, prop) => ({ ...obj, [prop]: value[prop] }),
      {}
    );
  }
  return value;
};

class Logger {
  source: string;
  isEnabled: boolean;

  constructor(source: string) {
    this.source = source;

    // Heavily inspired by the debug-package on npm
    // Enable log sources via prefix, e.g.
    //   LOG="shipmight:api:" node cli.js ...
    const enabledSources = env.log.split(",").filter((item) => item !== "");
    const isEnabled = enabledSources.some((enabledSource) =>
      source.startsWith(enabledSource)
    );
    this.isEnabled = isEnabled;
  }

  private _log(level: "info" | "error", data: Record<string, unknown>) {
    if (!this.isEnabled) {
      return;
    }

    const timestamp = new Date().toISOString();
    const source = this.source;
    if (logFormat === "json") {
      console.log(
        JSON.stringify(
          {
            timestamp,
            source,
            level,
            ...data,
          },
          jsonReplacer
        )
      );
    } else {
      console.error(
        [
          dim(`[${timestamp}]`),
          dim(`[${source}]`),
          (level === "error" ? red : blue)(`[${level}]`),
          " ",
          Object.keys(data)
            .map((key) => `${key}=${JSON.stringify(data[key], jsonReplacer)}`)
            .join(" "),
        ].join("")
      );
    }
  }

  info(data: string | Record<string, unknown>) {
    data = typeof data === "string" ? { message: data } : data;
    this._log("info", data);
  }

  error(data: string | Record<string, unknown>) {
    data = typeof data === "string" ? { message: data } : data;
    this._log("error", data);
  }
}

export function getLogger(source: LoggingSource): Logger {
  const logger = new Logger(`shipmight:${source}`);
  return logger;
}

export function expressLogger(
  log: Logger,
  options: {
    readLocalsRequestId?: (res: Response) => string;
  } = {}
): RequestHandler {
  let lastReadyzStatus: number;
  return responseTime((req: Request, res: Response, time) => {
    const requestId = options.readLocalsRequestId
      ? options.readLocalsRequestId(res)
      : undefined;

    // Only log /readyz when status changes, to avoid filling access logs with "/readyz 200" x 1000
    if (req.url.endsWith("/readyz")) {
      if (
        lastReadyzStatus !== undefined &&
        res.statusCode === lastReadyzStatus
      ) {
        return;
      }
      log.info(
        `turning off /readyz logging until status changes from ${res.statusCode}`
      );
      lastReadyzStatus = res.statusCode;
    }

    log.info({
      ...(requestId ? { requestId } : {}),
      method: req.method,
      path: req.url,
      status: res.statusCode,
      ms: Math.floor(time),
    });
  });
}

export function hpmLogger(log: Logger): LogProviderCallback {
  return () => {
    return {
      log: log.info.bind(log),
      info: log.info.bind(log),
      error: log.error.bind(log),
    };
  };
}
