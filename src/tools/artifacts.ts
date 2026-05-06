import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CodemagicClient } from "../lib/client.ts";
import { errorResult, jsonResult } from "../lib/response.ts";
import { CreatePublicArtifactUrlSchema, GetArtifactSchema } from "../schemas.ts";

export function registerArtifactTools(server: McpServer, client: CodemagicClient): void {
  server.registerTool(
    "codemagic_get_artifact",
    {
      title: "Get a Codemagic build artifact (metadata)",
      description: "Fetch metadata about a build artifact by its secure filename ('uuid1/uuid2/filename.ext'). Returns size, content type, and a base64 preview snippet — for full downloads prefer codemagic_create_public_artifact_url which returns a signed URL.",
      inputSchema: GetArtifactSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ secure_filename }) => {
      try {
        const path = `/artifacts/${secure_filename.split("/").map(encodeURIComponent).join("/")}`;
        const raw = await client.requestBytes(path);
        const previewLimit = 4096;
        const preview = raw.bytes.slice(0, previewLimit);
        const base64Preview = bytesToBase64(preview);
        return jsonResult({
          secure_filename,
          status: raw.status,
          content_type: raw.headers.get("content-type"),
          content_length: raw.bytes.byteLength,
          truncated: raw.bytes.byteLength > previewLimit,
          base64_preview: base64Preview,
        }, client);
      } catch (err) {
        return errorResult(err, client);
      }
    },
  );

  server.registerTool(
    "codemagic_create_public_artifact_url",
    {
      title: "Create a public download URL for a Codemagic artifact",
      description: "Create a time-limited public download URL for a build artifact. expires_at is a UNIX timestamp in seconds and must be in the future.",
      inputSchema: CreatePublicArtifactUrlSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ secure_filename, expires_at }) => {
      try {
        if (expires_at * 1000 <= Date.now()) {
          return errorResult(new Error("expires_at must be a UNIX timestamp in the future (seconds)"), client);
        }
        const path = `/artifacts/${secure_filename.split("/").map(encodeURIComponent).join("/")}/public-url`;
        const data = await client.requestJson<unknown>(path, {
          method: "POST",
          body: { expiresAt: expires_at },
        });
        return jsonResult(data, client);
      } catch (err) {
        return errorResult(err, client);
      }
    },
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}
