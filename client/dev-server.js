import { createServer } from "vite";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const server = await createServer({
  root: __dirname,
  configFile: path.join(__dirname, "vite.config.js"),
  server: { port: 5173, host: true },
});

await server.listen();
server.printUrls();

// Keep the process alive and handle graceful shutdown
process.on("SIGTERM", async () => {
  await server.close();
  process.exit(0);
});
process.on("SIGINT", async () => {
  await server.close();
  process.exit(0);
});
process.stdin.resume();
