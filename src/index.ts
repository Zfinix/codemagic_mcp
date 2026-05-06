#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CodemagicClient } from "./lib/client.ts";
import { loadConfig } from "./lib/config.ts";
import { registerAppTools } from "./tools/apps.ts";
import { registerArtifactTools } from "./tools/artifacts.ts";
import { registerBuildTools } from "./tools/builds.ts";
import { registerCacheTools } from "./tools/caches.ts";
import { registerTeamTools } from "./tools/teams.ts";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new CodemagicClient(config);

  const server = new McpServer({
    name: "codemagic_mcp",
    version: "0.1.0",
  });

  registerAppTools(server, client);
  registerBuildTools(server, client);
  registerArtifactTools(server, client);
  registerCacheTools(server, client);
  registerTeamTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("codemagic_mcp running on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
