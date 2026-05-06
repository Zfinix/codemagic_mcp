const SECRET_KEY_PATTERNS = [
  /x-auth-token/i,
  /authorization/i,
  /api[-_]?key/i,
  /password/i,
  /passphrase/i,
  /ssh[-_]?key/i,
  /secret/i,
  /token/i,
];

const REDACTED = "[REDACTED]";

export function redactString(value: string, secrets: readonly string[]): string {
  let out = value;
  for (const secret of secrets) {
    if (!secret) continue;
    while (out.includes(secret)) {
      out = out.replace(secret, REDACTED);
    }
  }
  return out;
}

export function redactObject<T>(value: T, secrets: readonly string[]): T {
  return walk(value, secrets) as T;
}

function walk(value: unknown, secrets: readonly string[]): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value, secrets);
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => walk(item, secrets));

  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY_PATTERNS.some((re) => re.test(key))) {
      out[key] = REDACTED;
    } else {
      out[key] = walk(raw, secrets);
    }
  }
  return out;
}
