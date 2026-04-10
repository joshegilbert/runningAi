const DEFAULT_TIMEOUT_MS = 60000;

function withTimeout(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { controller, cancel: () => clearTimeout(id) };
}

function getTimeoutMs(override) {
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return override;
  }
  const fromEnv = Number.parseInt(process.env.LLM_TIMEOUT_MS || "", 10);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return DEFAULT_TIMEOUT_MS;
}

/** True if a second attempt may succeed (timeout, rate limit, server errors). */
export function isRetryableLlmError(err) {
  const msg = err?.message || String(err);
  if (msg.includes("AbortError") || /aborted|timeout/i.test(msg)) return true;
  if (/LLM HTTP 429/.test(msg)) return true;
  if (/LLM HTTP 5\d\d/.test(msg)) return true;
  return false;
}

export async function callLLM({
  messages,
  temperature = 0.7,
  responseFormat,
  timeoutMs,
} = {}) {
  const baseUrl = process.env.LLM_BASE_URL; // e.g. https://api.your-llm.com/v1
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || "gpt-4o-mini"; // placeholder default

  if (!baseUrl || !apiKey) {
    throw new Error("Missing LLM_BASE_URL or LLM_API_KEY env vars");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const ms = getTimeoutMs(timeoutMs);

  const { controller, cancel } = withTimeout(ms);

  try {
    const resp = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        // Optional: some providers support forcing JSON output
        ...(responseFormat ? { response_format: responseFormat } : {}),
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`LLM HTTP ${resp.status}: ${text}`);
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) throw new Error("LLM returned empty content");

    return { content, modelUsed: model };
  } finally {
    cancel();
  }
}

/**
 * Calls callLLM up to `attempts` times on retryable errors.
 */
export async function callLLMWithRetry(opts, { attempts = 2 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await callLLM(opts);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1 && isRetryableLlmError(err)) {
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
