export interface CodemagicConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
}

export function loadConfig(): CodemagicConfig {
  const apiKey = process.env.CODEMAGIC_API_KEY;
  if (!apiKey) {
    throw new Error("CODEMAGIC_API_KEY environment variable is required");
  }

  const baseUrl = (process.env.CODEMAGIC_BASE_URL ?? "https://api.codemagic.io").replace(/\/+$/, "");
  const timeoutMs = Number.parseInt(process.env.CODEMAGIC_TIMEOUT_MS ?? "30000", 10);
  const maxRetries = Number.parseInt(process.env.CODEMAGIC_MAX_RETRIES ?? "3", 10);

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("CODEMAGIC_TIMEOUT_MS must be a positive integer");
  }
  if (!Number.isFinite(maxRetries) || maxRetries < 0) {
    throw new Error("CODEMAGIC_MAX_RETRIES must be a non-negative integer");
  }

  return { apiKey, baseUrl, timeoutMs, maxRetries };
}
