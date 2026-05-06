import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CodemagicClient } from "../lib/client.ts";
import { errorResult, jsonResult } from "../lib/response.ts";
import { DeleteTeamMemberSchema, InviteTeamMemberSchema } from "../schemas.ts";

export function registerTeamTools(server: McpServer, client: CodemagicClient): void {
  server.registerTool(
    "codemagic_invite_team_member",
    {
      title: "Invite a member to a Codemagic team",
      description: "Invite a user by email to a team. role must be 'owner' (Admin) or 'developer' (Member). Returns the full team object on success.",
      inputSchema: InviteTeamMemberSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ team_id, email, role }) => {
      try {
        const data = await client.requestJson<unknown>(
          `/team/${encodeURIComponent(team_id)}/invitation`,
          { method: "POST", body: { email, role } },
        );
        return jsonResult(data, client);
      } catch (err) {
        return errorResult(err, client);
      }
    },
  );

  server.registerTool(
    "codemagic_delete_team_member",
    {
      title: "Remove a member from a Codemagic team",
      description: "Remove a collaborator from a team by user_id. Destructive: the user immediately loses access to the team's apps.",
      inputSchema: DeleteTeamMemberSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ team_id, user_id }) => {
      try {
        const raw = await client.requestRaw(
          `/team/${encodeURIComponent(team_id)}/collaborator/${encodeURIComponent(user_id)}`,
          { method: "DELETE", acceptedNoBodyStatuses: [200, 202, 204] },
        );
        const body = raw.bodyText
          ? JSON.parse(raw.bodyText)
          : { message: "Member removed from team", team_id, user_id };
        return jsonResult(body, client);
      } catch (err) {
        return errorResult(err, client);
      }
    },
  );
}
