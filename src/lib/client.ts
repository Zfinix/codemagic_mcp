import type { CodemagicConfig } from "./config.ts";
import {
  CodemagicAuthError,
  CodemagicError,
  CodemagicNetworkError,
  CodemagicNotFoundError,
  CodemagicRateLimitError,
  CodemagicServerError,
  CodemagicValidationError,
} from "./errors.ts";
import { redactString } from "./redact.ts";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  acceptedNoBodyStatuses?: readonly number[];
}

export interface RawResponse {
  status: number;
  headers: Headers;
  bodyText: string;
}

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const DEFAULT_NO_BODY_STATUSES: readonly number[] = [202, 204, 208];

export class CodemagicClient {
  constructor(private readonly config: CodemagicConfig) {}

  redact(value: string): string {
    return redactString(value, [this.config.apiKey]);
  }

  async requestJson<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const raw = await this.request(endpoint, options);
    if (!raw.bodyText) return undefined as T;
    try {
      return JSON.parse(raw.bodyText) as T;
    } catch {
      throw new CodemagicError(`Failed to parse JSON response from ${endpoint}`, {
        status: raw.status,
        endpoint,
        details: raw.bodyText.slice(0, 500),
      });
    }
  }

  async requestRaw(endpoint: string, options: RequestOptions = {}): Promise<RawResponse> {
    return this.request(endpoint, options);
  }

  async requestBytes(endpoint: string, options: RequestOptions = {}): Promise<{ status: number; headers: Headers; bytes: Uint8Array }> {
    const url = this.buildUrl(endpoint, options.query);
    const init = this.buildInit(options);
    const { response, attempts } = await this.fetchWithRetry(url, init, endpoint);
    if (!response.ok) {
      const text = await safeText(response);
      throwForStatus(response.status, response.headers, endpoint, text, attempts);
    }
    const buf = new Uint8Array(await response.arrayBuffer());
    return { status: response.status, headers: response.headers, bytes: buf };
  }

  private async request(endpoint: string, options: RequestOptions): Promise<RawResponse> {
    const url = this.buildUrl(endpoint, options.query);
    const init = this.buildInit(options);
    const acceptedNoBody = options.acceptedNoBodyStatuses ?? DEFAULT_NO_BODY_STATUSES;

    const { response, attempts } = await this.fetchWithRetry(url, init, endpoint);
    const bodyText = await safeText(response);

    if (response.ok || acceptedNoBody.includes(response.status)) {
      return { status: response.status, headers: response.headers, bodyText };
    }

    throwForStatus(response.status, response.headers, endpoint, bodyText, attempts);
  }

  private buildUrl(endpoint: string, query?: RequestOptions["query"]): string {
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = new URL(`${this.config.baseUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private buildInit(options: RequestOptions): RequestInit {
    const headers: Record<string, string> = {
      "x-auth-token": this.config.apiKey,
      Accept: "application/json",
      "User-Agent": "codemagic-mcp/0.1",
    };
    let body: string | undefined;
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }
    return {
      method: options.method ?? "GET",
      headers,
      body,
    };
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    endpoint: string,
  ): Promise<{ response: Response; attempts: number }> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const response = await fetch(url, { ...init, signal: controller.signal });
        clearTimeout(timer);
        if (RETRYABLE_STATUSES.has(response.status) && attempt <= this.config.maxRetries) {
          const wait = computeBackoffMs(response.headers.get("retry-after"), attempt);
          await sleep(wait);
          continue;
        }
        return { response, attempts: attempt };
      } catch (err) {
        clearTimeout(timer);
        lastError = err;
        if (attempt > this.config.maxRetries) break;
        await sleep(computeBackoffMs(null, attempt));
      }
    }
    const message = lastError instanceof Error ? lastError.message : String(lastError);
    throw new CodemagicNetworkError(message, { endpoint });
  }
}

function throwForStatus(
  status: number,
  headers: Headers,
  endpoint: string,
  bodyText: string,
  attempts: number,
): never {
  const details = parseDetails(bodyText);
  const message = extractMessage(details, bodyText) ?? `HTTP ${status} from ${endpoint} after ${attempts} attempt(s)`;

  if (status === 401) throw new CodemagicAuthError(message, { status, endpoint, details });
  if (status === 403) throw new CodemagicAuthError(message, { status, endpoint, details });
  if (status === 404) throw new CodemagicNotFoundError(message, { status, endpoint, details });
  if (status === 422 || (status >= 400 && status < 429)) {
    throw new CodemagicValidationError(message, { status, endpoint, details });
  }
  if (status === 429) {
    const retryAfterMs = parseRetryAfterMs(headers.get("retry-after"));
    throw new CodemagicRateLimitError(message, { status, endpoint, details, retryAfterMs });
  }
  if (status >= 500) throw new CodemagicServerError(message, { status, endpoint, details });
  throw new CodemagicError(message, { status, endpoint, details });
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function parseDetails(bodyText: string): unknown {
  if (!bodyText) return undefined;
  try {
    return JSON.parse(bodyText);
  } catch {
    return bodyText.slice(0, 500);
  }
}

function extractMessage(details: unknown, fallback: string): string | undefined {
  if (details && typeof details === "object" && !Array.isArray(details)) {
    const obj = details as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
  }
  return fallback || undefined;
}

function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}

function computeBackoffMs(retryAfter: string | null, attempt: number): number {
  const fromHeader = parseRetryAfterMs(retryAfter);
  if (fromHeader !== undefined) return Math.min(fromHeader, 30_000);
  const base = Math.min(500 * 2 ** (attempt - 1), 8_000);
  const jitter = Math.floor(Math.random() * 250);
  return base + jitter;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
