/**
 * Admin client-side fetch wrapper. Admin panel apni hi origin (3001) ki
 * /api/v1 API call karta hai, isliye base relative hai aur cookies same-origin
 * automatically jaati hain.
 */
const BASE_URL = "/api/v1";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request(path, { method = "GET", body, headers, ...rest } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  let data = null;
  if ((res.headers.get("content-type") || "").includes("application/json")) {
    data = await res.json();
  }
  if (!res.ok) {
    throw new ApiError(
      data?.error || data?.message || `Request failed (${res.status})`,
      res.status,
      data
    );
  }
  return data;
}

export const api = {
  get: (p, o) => request(p, { ...o, method: "GET" }),
  post: (p, b, o) => request(p, { ...o, method: "POST", body: b }),
  put: (p, b, o) => request(p, { ...o, method: "PUT", body: b }),
  patch: (p, b, o) => request(p, { ...o, method: "PATCH", body: b }),
  delete: (p, o) => request(p, { ...o, method: "DELETE" }),
};

export default api;
