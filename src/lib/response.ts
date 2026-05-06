import type { CodemagicClient } from "./client.ts";
import { formatErrorForUser } from "./errors.ts";
import { redactObject } from "./redact.ts";

export interface ToolTextResponse {
  [x: string]: unknown;
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export function jsonResult(data: unknown, client: CodemagicClient): ToolTextResponse {
  const safe = redactObject(data, []);
  const text = client.redact(JSON.stringify(safe ?? null, null, 2));
  const structured = isPlainObject(safe) ? (safe as Record<string, unknown>) : { value: safe };
  return {
    content: [{ type: "text", text }],
    structuredContent: structured,
  };
}

export function textResult(text: string, client: CodemagicClient): ToolTextResponse {
  return { content: [{ type: "text", text: client.redact(text) }] };
}

export function errorResult(error: unknown, client: CodemagicClient): ToolTextResponse {
  return {
    isError: true,
    content: [{ type: "text", text: client.redact(formatErrorForUser(error)) }],
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
