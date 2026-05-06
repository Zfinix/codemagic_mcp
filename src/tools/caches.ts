import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CodemagicClient } from "../lib/client.ts";
import { errorResult, jsonResult } from "../lib/response.ts";
import { AppCacheSchema, AppIdSchema } from "../schemas.ts";

export function registerCacheTools(server: McpServer, client: CodemagicClient): void {
  server.registerTool(
    "codemagic_get_app_caches",
    {
      title: "List caches for a Codemagic application",
      description: "List the stored caches for an application.",
      inputSchema: AppIdSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ app_id }) => {
      try {
        const data = await client.requestJson<unknown>(`/apps/${encodeURIComponent(app_id)}/caches`);
        return jsonResult(data, client);
      } catch (err) {
        return errorResult(err, client);
      }
    },
  );

  server.registerTool(
    "codemagic_delete_all_app_caches",
    {
      title: "Delete all caches for a Codemagic application",
      description: "Delete every stored cache for an application. Codemagic responds with 202 Accepted listing the cache IDs scheduled for deletion.",
      inputSchema: AppIdSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ app_id }) => {
      try {
        const raw = await client.requestRaw(`/apps/${encodeURIComponent(app_id)}/caches`, {
          method: "DELETE",
          acceptedNoBodyStatuses: [200, 202, 204],
        });
        const body = raw.bodyText ? JSON.parse(raw.bodyText) : { message: "Caches scheduled for deletion", app_id };
        return jsonResult(body, client);
      } catch (err) {
        return errorResult(err, client);
      }
    },
  );

  server.registerTool(
    "codemagic_delete_app_cache",
    {
      title: "Delete a single Codemagic application cache",
      description: "Delete one specific cache by cache_id from an application.",
      inputSchema: AppCacheSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ app_id, cache_id }) => {
      try {
        const raw = await client.requestRaw(
          `/apps/${encodeURIComponent(app_id)}/caches/${encodeURIComponent(cache_id)}`,
          { method: "DELETE", acceptedNoBodyStatuses: [200, 202, 204] },
        );
        const body = raw.bodyText
          ? JSON.parse(raw.bodyText)
          : { message: "Cache scheduled for deletion", app_id, cache_id };
        return jsonResult(body, client);
      } catch (err) {
        return errorResult(err, client);
      }
    },
  );
}
