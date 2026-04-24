const DEFAULT = "http://localhost:5173";

export function primaryClientOrigin() {
  const raw = process.env.CLIENT_ORIGIN || DEFAULT;
  return raw.split(",")[0].trim() || DEFAULT;
}

export function corsOrigins() {
  const raw = process.env.CLIENT_ORIGIN || DEFAULT;
  if (raw.includes(",")) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return raw;
}
