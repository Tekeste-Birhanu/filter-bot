const TRANSIENT_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENOTFOUND",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "EPIPE",
  "ECONNABORTED",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
]);

export function isTransientError(error) {
  const status = Number(error?.status ?? error?.statusCode ?? error?.code);
  if (status === 420 || status === 429 || status >= 500) return true;
  if (TRANSIENT_CODES.has(String(error?.code || "").toUpperCase())) return true;
  return /network|timeout|temporarily unavailable|server error|service unavailable|socket hang up/i.test(error?.message || "");
}

/** Retries transient network, rate-limit, and server errors with capped backoff. */
export async function withTransientRetries(operation, { label = "operation", retries = 3 } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= retries || !isTransientError(error)) throw error;
      const retryAfterSeconds = Number(error?.retryAfter ?? error?.parameters?.retry_after ?? error?.seconds ?? 0);
      const backoffMs = Math.min(1000 * 2 ** attempt, 8000);
      const delayMs = retryAfterSeconds > 0 ? Math.min(retryAfterSeconds * 1000, 30000) : backoffMs;
      console.warn(`[Resilience] ${label} failed (${error.message}); retrying in ${delayMs}ms (${attempt + 1}/${retries}).`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
