import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";

if (!existsSync("out")) {
  throw new Error("Static export directory was not created.");
}

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist/client", { recursive: true });
mkdirSync("dist/server", { recursive: true });
mkdirSync("dist/.openai", { recursive: true });

cpSync("out", "dist/client", { recursive: true });
cpSync("scripts/static-worker.js", "dist/server/index.js");
cpSync(".openai/hosting.json", "dist/.openai/hosting.json");
