# codemagic_mcp

MCP server for the [Codemagic](https://codemagic.io) CI/CD API. Bun + TypeScript, stdio transport.

## Tools

Apps

- `codemagic_get_all_applications`
- `codemagic_get_application`
- `codemagic_add_application`
- `codemagic_add_application_private`

Builds

- `codemagic_start_build`
- `codemagic_get_builds`
- `codemagic_get_build_status`
- `codemagic_cancel_build`

Artifacts

- `codemagic_get_artifact` (returns metadata + base64 preview; use the public URL tool for full downloads)
- `codemagic_create_public_artifact_url`

Caches

- `codemagic_get_app_caches`
- `codemagic_delete_all_app_caches`
- `codemagic_delete_app_cache`

Teams

- `codemagic_invite_team_member`
- `codemagic_delete_team_member`

## Configuration

Environment variables:

| Variable | Required | Default | Notes |
|---|---|---|---|
| `CODEMAGIC_API_KEY` | yes | — | From Teams settings → Personal Account → API |
| `CODEMAGIC_BASE_URL` | no | `https://api.codemagic.io` | Override for self-hosted/staging |
| `CODEMAGIC_TIMEOUT_MS` | no | `30000` | Per-request timeout |
| `CODEMAGIC_MAX_RETRIES` | no | `3` | Retries on 408/425/429/5xx and network errors (exponential backoff with jitter, honors `Retry-After`) |

## Run

```bash
bun install
CODEMAGIC_API_KEY=... bun run start
```

Watch mode:

```bash
CODEMAGIC_API_KEY=... bun run dev
```

Inspect with the official MCP inspector:

```bash
CODEMAGIC_API_KEY=... bun run inspect
```

## Claude Code / Claude Desktop config

```json
{
  "mcpServers": {
    "codemagic": {
      "command": "bun",
      "args": ["run", "/Users/chizi/projects/work-projects/mcp/codemagic_mcp/src/index.ts"],
      "env": { "CODEMAGIC_API_KEY": "..." }
    }
  }
}
```

## Security notes

- API key is read from env only.
- Outgoing requests send the key via `x-auth-token`; it is never logged.
- All tool output (text and structured) is run through a redactor that masks the key value and any object keys matching `authorization`, `x-auth-token`, `api[-_]?key`, `password`, `passphrase`, `ssh[-_]?key`, `secret`, or `token`.
- Errors are mapped to typed classes (`CodemagicAuthError`, `CodemagicNotFoundError`, `CodemagicValidationError`, `CodemagicRateLimitError`, `CodemagicServerError`, `CodemagicNetworkError`) and surfaced as actionable messages — internal stack traces are not exposed to the client.

## Layout

```
src/
  index.ts          stdio entrypoint
  schemas.ts        Zod input schemas
  lib/
    config.ts       env loading + validation
    client.ts       fetch wrapper: timeouts, retries, status mapping
    errors.ts       typed error classes + user-facing formatter
    redact.ts       secret/string + key-pattern redaction
    response.ts     jsonResult / textResult / errorResult helpers
  tools/
    apps.ts builds.ts artifacts.ts caches.ts teams.ts
```
