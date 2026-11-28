import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { once } from "node:events";
import { reportStagingError, stagingConfig, stagingDatabase, verifyStagingDatabase } from "./staging-auth-config.mjs";

let config;
let app;
let server;
try {
  config = stagingConfig();
  await verifyStagingDatabase(config);
  await config.client.close();

  const hostname = "127.0.0.1";
  let handle;
  server = createServer((request, response) => {
    if (!handle || request.headers.host !== `${hostname}:${server.address().port}`) {
      response.writeHead(503).end();
      return;
    }
    void handle(request, response).catch(() => {
      if (!response.headersSent) response.writeHead(500);
      response.end();
    });
  });
  server.listen(process.send ? 0 : 3100, hostname);
  await once(server, "listening");
  const { port } = server.address();
  const origin = `http://${hostname}:${port}`;

  Object.assign(process.env, {
    NODE_ENV: "development",
    DENGUE_AUTH_STAGING_PORT: String(port),
    MONGODB_URI: config.uri,
    MONGODB_DB: stagingDatabase,
    BETTER_AUTH_SECRET: config.secret,
    BETTER_AUTH_URL: origin,
    AUTH_TRUSTED_IP_HEADER: "",
    INFERENCE_API_URL: "",
    INFERENCE_API_TOKEN: "",
  });

  const stagingBuildDir = `.next/staging-auth-${port}`;
  await mkdir(stagingBuildDir, { recursive: true });
  await writeFile(`${stagingBuildDir}/tsconfig.json`, JSON.stringify({
    extends: "../../tsconfig.json",
    include: ["../../next-env.d.ts", "../../**/*.ts", "../../**/*.tsx", "../../**/*.mts", "dev/types/**/*.ts", "types/**/*.ts"],
  }) + "\n");

  const { default: next } = await import("next");
  app = next({ dev: true, hostname, port, httpServer: server, quiet: true });
  await app.prepare();
  handle = app.getRequestHandler();
  if (process.send) process.send({ origin });
  else console.log(`Staging auth app ready at ${origin}`);

  const stop = () => {
    server.close();
    server.closeAllConnections();
    void app.close().catch(() => {}).finally(() => process.exit(0));
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  if (process.send) process.once("disconnect", stop);
} catch (error) {
  reportStagingError(error, "Could not start the loopback staging app. Check staging connectivity, permissions, and the local port.");
  server?.close();
  await app?.close().catch(() => {});
  await config?.client.close();
}
