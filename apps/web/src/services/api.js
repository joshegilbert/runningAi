const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_PREFIX = "/api";


async function buildError(res) {
  let message = `Request failed (${res.status})`;

  try {
    const data = await res.json();
    message =
      data?.message ||
      data?.error ||
      (Array.isArray(data?.errors) ? data.errors.join(", ") : message);

    return { status: res.status, message, data };
  } catch {
    return { status: res.status, message };
  }
}

function makeUrl(path) {
  if (!BASE_URL) {
    throw new Error("Missing VITE_API_BASE_URL in your frontend .env file");
  }

  const cleanBase = BASE_URL.replace(/\/+$/, "");

  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (cleanPath.startsWith(API_PREFIX + "/")) {
    return `${cleanBase}${cleanPath}`;
  }

  return `${cleanBase}${API_PREFIX}${cleanPath}`;
}


export function createApiClient(tokenGetter = () => null) {
  async function request(path, { method = "GET", body } = {}) {
    const headers = { "Content-Type": "application/json" };

    const token = tokenGetter?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(makeUrl(path), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      throw await buildError(res);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  return {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: "POST", body }),
    put: (path, body) => request(path, { method: "PUT", body }),
    patch: (path, body) => request(path, { method: "PATCH", body }),
    del: (path) => request(path, { method: "DELETE" }),
  };
}
