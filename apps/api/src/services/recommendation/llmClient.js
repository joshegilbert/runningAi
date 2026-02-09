const DEFAULT_TIMEOUT_MS = 20000;

function withTimeout(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { controller, cancel: () => clearTimeout(id) };
}

export async function callLLM({ messages, temperature = 0.7 }) {
  const baseUrl = process.env.LLM_BASE_URL; // e.g. https://api.your-llm.com/v1
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || "gpt-4o-mini"; // placeholder default

  if (!baseUrl || !apiKey) {
    throw new Error("Missing LLM_BASE_URL or LLM_API_KEY env vars");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  const { controller, cancel } = withTimeout(DEFAULT_TIMEOUT_MS);

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
        // If your provider supports it, you can add response_format here later
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
