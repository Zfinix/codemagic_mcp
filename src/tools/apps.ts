import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CodemagicClient } from "../lib/client.ts";
import { errorResult, jsonResult } from "../lib/response.ts";
import {
  AddApplicationPrivateSchema,
  AddApplicationSchema,
  EmptySchema,
  GetApplicationSchema,
} from "../schemas.ts";

export function registerAppTools(server: McpServer, client: CodemagicClient): void {
  server.registerTool(
    "codemagic_get_all_applications",
    {
      title: "List all Codemagic applications",
      description: "Retrieve every application visible to the authenticated Codemagic user. Returns the raw Codemagic /apps payload (an object with an 'applications' array).",
      inputSchema: EmptySchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const data = await client.requestJson<unknown>("/apps");
        return jsonResult(data, client);
      } catch (err) {
        return errorResult(err, client);
      }
    },
  );

  server.registerTool(
    "codemagic_get_application",
    {
      title: "Get a Codemagic application by ID",
      description: "Retrieve a single application by its Codemagic ID. Returns the raw /apps/{id} payload.",
      inputSchema: GetApplicationSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ app_id }) => {
      try {
        const data = await client.requestJson<unknown>(`/apps/${encodeURIComponent(app_id)}`);
        return jsonResult(data, client);
      } catch (err) {
        return errorResult(err, client);
      }
    },
  );

  server.registerTool(
    "codemagic_add_application",
    {
      title: "Add a Codemagic application from a public repository",
      description: "Add a new application to Codemagic from a public Git repository. For private repos use codemagic_add_application_private instead.",
      inputSchema: AddApplicationSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ repository_url, team_id }) => {
      try {
        const body: Record<string, unknown> = { repositoryUrl: repository_url };
        if (team_id) body.teamId = team_id;
        const data = await client.requestJson<unknown>("/apps", { method: "POST", body });
        return jsonResult(data, client);
      } catch (err) {
        return errorResult(err, client);
      }
    },
  );

  server.registerTool(
    "codemagic_add_application_private",
    {
      title: "Add a Codemagic application from a private repository",
      description: "Add a new application from a private Git repository. The SSH private key is base64-encoded and must be provided via ssh_key_data.",
      inputSchema: AddApplicationPrivateSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ repository_url, ssh_key_data, ssh_key_passphrase, project_type, team_id }) => {
      try {
        const body: Record<string, unknown> = {
          repositoryUrl: repository_url,
          sshKey: { data: ssh_key_data, passphrase: ssh_key_passphrase ?? null },
        };
        if (project_type) body.projectType = project_type;
        if (team_id) body.teamId = team_id;
        const data = await client.requestJson<unknown>("/apps/new", { method: "POST", body });
        return jsonResult(data, client);
      } catch (err) {
        return errorResult(err, client);
      }
    },
  );
}
