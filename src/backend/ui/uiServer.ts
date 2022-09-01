import express from "express";
import path from "path";
import PromiseRouter from "express-promise-router";
import { createProxyMiddleware } from "http-proxy-middleware";
import { expressLogger, getLogger, hpmLogger } from "../utils/logging";
import env from "../utils/env";
import {
  trimSlashes,
  withLeadingSlash,
  withTrailingSlash,
} from "../utils/string";

const log = getLogger("ui:uiServer");

export default function uiServer(options: { basePath?: string }) {
  const basePath = withLeadingSlash(trimSlashes(options.basePath || ""));

  const router = PromiseRouter();

  const distDir = path.join(__dirname, "../../");
  router.use("/ui", express.static(`${distDir}/frontend/ui`));
  router.use("/static", express.static(`${distDir}/frontend/static`));

  router.use(expressLogger(log));

  router.get("/readyz", async (req, res, next) => {
    res.status(200).json({});
  });

  const apiProxy = createProxyMiddleware({
    target: env.uiApiProxyEndpoint,
    pathRewrite: {
      [`^${withTrailingSlash(basePath)}api`]: "",
    },
    logProvider: hpmLogger(log),
  });
  router.use("/api", apiProxy);

  router.get("*", (req, res, next) => {
    const baseUri = withTrailingSlash(basePath);
    const shipmightGlobals: Window["shipmightGlobals"] = {
      baseUri,
    };
    res.set("content-type", "text/html").send(/*html*/ `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <link rel="icon" type="image/png" href="${baseUri}static/images/favicon.png" />
          <link rel="stylesheet" href="${baseUri}static/css/codemirror.css" />
          <link rel="stylesheet" href="${baseUri}static/css/codemirror.shipmight.css" />
          <title></title>
          <style>
            html,
            body,
            .app {
              height: 100%;
            }
            body {
              --font-family-monospace: "Menlo", monospace;
            }
            body:not(.disable-overflow-y) {
              overflow-y: scroll;
            }
          </style>
        </head>
        <body>
          <div class="app"></div>
          <script>var shipmightGlobals = ${JSON.stringify(
            shipmightGlobals
          )};</script>
          <script src="${baseUri}ui/ui.js"></script>
        </body>
      </html>
    `);
  });

  const app = express();
  app.use(basePath, router);
  return app;
}
