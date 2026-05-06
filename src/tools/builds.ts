import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CodemagicClient } from "../lib/client.ts";
import { errorResult, jsonResult } from "../lib/response.ts";
import { BuildIdSchema, GetBuildsSchema, StartBuildSchema } from "../schemas.ts";

export function registerBuildTools(server: McpServer, client: CodemagicClient): void {
  server.registerTool(
    "codemagic_start_build",
    {
      title: "Start a Codemagic build",
      description: "Trigger a new build for a workflow on a given branch or tag. Either branch or tag must be provided. Returns the new build identifier.",
      inputSchema: StartBuildSchema.innerType().shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (input) => {
      try {
        const parsed = StartBuildSchema.parse(input);
        const body: Record<string, unknown> = {
          appId: parsed.app_id,
          workflowId: parsed.workflow_id,
        };
        if (parsed.branch) body.branch = parsed.branch;
        if (parsed.tag) body.tag = parsed.tag;
        if (parsed.environment) body.environment = parsed.environment;
        if (parsed.labels) body.labels = parsed.labels;
        if (parsed.instance_type) body.instanceType = parsed.instance_type;
        const data = await client.requestJson<unknown>("/builds", { method: "POST", body });
        return jsonResult(data, client);
      } catch (err) {
        return errorResult(err, client);
      }
    },
  );

  server.registerTool(
    "codemagic_get_builds",
    {
      title: "List Codemagic builds",
      description: "List builds from history, optionally filtered by application, workflow, branch, or tag.",
      inputSchema: GetBuildsSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ app_id, workflow_id, branch, tag }) => {
      try {
        const data = await client.requestJson<unknown>("/builds", {
          query: { appId: app_id, workflowId: workflow_id, branch, tag },
        });
        return jsonResult(data, client);
      } catch (err) {
        return errorResult(err, client);
      }
    },
  );

  server.registerTool(
    "codemagic_get_build_status",
    {
      title: "Get a Codemagic build status",
      description: "Retrieve the application + build payload for a single build by its build_id.",
      inputSchema: BuildIdSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ build_id }) => {
      try {
        const data = await client.requestJson<unknown>(`/builds/${encodeURIComponent(build_id)}`);
        return jsonResult(data, client);
      } catch (err) {
        return errorResult(err, client);
      }
    },
  );

  server.registerTool(
    "codemagic_cancel_build",
    {
      title: "Cancel a running Codemagic build",
      description: "Cancel a build that is queued or in progress. If the build has already finished, returns a message indicating so.",
      inputSchema: BuildIdSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ build_id }) => {
      try {
        const raw = await client.requestRaw(`/builds/${encodeURIComponent(build_id)}/cancel`, {
          method: "POST",
          acceptedNoBodyStatuses: [200, 202, 204, 208],
        });
        if (raw.status === 208) {
          return jsonResult({ message: "Build has already finished", build_id }, client);
        }
        const body = raw.bodyText ? JSON.parse(raw.bodyText) : { message: "Cancellation accepted", build_id };
        return jsonResult(body, client);
      } catch (err) {
        return errorResult(err, client);
      }
    },
  );
}
