export class CodemagicError extends Error {
  override readonly name: string = "CodemagicError";
  readonly status?: number;
  readonly endpoint?: string;
  readonly details?: unknown;

  constructor(message: string, opts: { status?: number; endpoint?: string; details?: unknown } = {}) {
    super(message);
    this.status = opts.status;
    this.endpoint = opts.endpoint;
    this.details = opts.details;
  }
}

export class CodemagicAuthError extends CodemagicError {
  override readonly name = "CodemagicAuthError";
}

export class CodemagicNotFoundError extends CodemagicError {
  override readonly name = "CodemagicNotFoundError";
}

export class CodemagicValidationError extends CodemagicError {
  override readonly name = "CodemagicValidationError";
}

export class CodemagicRateLimitError extends CodemagicError {
  override readonly name = "CodemagicRateLimitError";
  readonly retryAfterMs?: number;
  constructor(message: string, opts: { status?: number; endpoint?: string; details?: unknown; retryAfterMs?: number } = {}) {
    super(message, opts);
    this.retryAfterMs = opts.retryAfterMs;
  }
}

export class CodemagicServerError extends CodemagicError {
  override readonly name = "CodemagicServerError";
}

export class CodemagicNetworkError extends CodemagicError {
  override readonly name = "CodemagicNetworkError";
}

export function formatErrorForUser(error: unknown): string {
  if (error instanceof CodemagicAuthError) {
    return "Error: Authentication failed. Check that CODEMAGIC_API_KEY is set to a valid token (Teams settings > Personal Account > API).";
  }
  if (error instanceof CodemagicNotFoundError) {
    return `Error: Resource not found${error.endpoint ? ` at ${error.endpoint}` : ""}. Verify the ID is correct.`;
  }
  if (error instanceof CodemagicValidationError) {
    return `Error: Request rejected by Codemagic (${error.status ?? "validation"}): ${error.message}`;
  }
  if (error instanceof CodemagicRateLimitError) {
    const wait = error.retryAfterMs ? ` Retry after ~${Math.ceil(error.retryAfterMs / 1000)}s.` : "";
    return `Error: Rate limit exceeded.${wait}`;
  }
  if (error instanceof CodemagicServerError) {
    return `Error: Codemagic server error (${error.status ?? "5xx"}). Try again later.`;
  }
  if (error instanceof CodemagicNetworkError) {
    return `Error: Network failure contacting Codemagic: ${error.message}`;
  }
  if (error instanceof CodemagicError) {
    return `Error: ${error.message}`;
  }
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return `Error: ${String(error)}`;
}
