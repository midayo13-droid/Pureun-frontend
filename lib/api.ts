export type ApiErrorBody = {
  statusCode: number;
  code?: string;
  message: string;
  fields?: Record<string, string>;
};

export class ApiError extends Error {
  statusCode: number;
  code?: string;
  fields?: Record<string, string>;
  constructor(body: ApiErrorBody) {
    super(body.message);
    this.statusCode = body.statusCode;
    this.code = body.code;
    this.fields = body.fields;
  }
}

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export const AUTH_EVENT = "rental-auth";

export function getToken(): string | null {
  try {
    return localStorage.getItem("rental_token");
  } catch {
    return null;
  }
}

export function saveLogin(token: string, role: string, name: string) {
  localStorage.setItem("rental_token", token);
  localStorage.setItem("rental_role", role);
  localStorage.setItem("rental_name", name);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearLogin() {
  try {
    localStorage.removeItem("rental_token");
    localStorage.removeItem("rental_role");
    localStorage.removeItem("rental_name");
  } catch {}
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_EVENT));
}

export const SERVER_ERROR = "일시적인 문제가 생겼습니다. 잠시 후 다시 시도해 주세요. 입력한 내용은 유지됩니다.";

export async function apiFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; formData?: FormData; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  let res: Response;
  try {
    res = await fetch(BASE + path, { method: options.method || "GET", headers, body });
  } catch {
    throw new ApiError({ statusCode: 0, code: "NETWORK", message: "서버에 연결하지 못했습니다. " + SERVER_ERROR });
  }
  if (res.status === 204) return undefined as T;
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const d = (data || {}) as Partial<ApiErrorBody>;
    if (res.status === 401 && token) {
      clearLogin();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    throw new ApiError({
      statusCode: res.status,
      code: d.code,
      message: d.message || (res.status >= 500 ? SERVER_ERROR : "요청을 처리하지 못했습니다."),
      fields: d.fields,
    });
  }
  return data as T;
}

export function errMsg(e: unknown): string {
  return e instanceof ApiError ? e.message : SERVER_ERROR;
}
