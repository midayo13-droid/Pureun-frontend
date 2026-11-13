export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;
  code?: string;
  fields?: Record<string, string>;
  constructor(status: number, message: string, code?: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem("rental_token");
  } catch {
    return null;
  }
}

export function logoutToLogin() {
  try {
    ["rental_token", "rental_role", "rental_name"].forEach((k) => localStorage.removeItem(k));
  } catch {}
  window.location.href = "/login";
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.", "MSG-21");
  }
  if (res.status === 401) {
    logoutToLogin();
    throw new ApiError(401, "로그인이 필요합니다.");
  }
  if (!res.ok) {
    let body: { message?: string; code?: string; fields?: Record<string, string> } = {};
    try {
      body = await res.json();
    } catch {}
    throw new ApiError(
      res.status,
      body.message || "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      body.code,
      body.fields
    );
  }
  return res;
}

export async function adminFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await request(path, options);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function adminBlob(path: string): Promise<Blob> {
  const res = await request(path);
  return res.blob();
}

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "처리 중 오류가 발생했습니다.";
}

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  const s = d.slice(0, 10);
  const [y, m, dd] = s.split("-").map(Number);
  if (!y) return d;
  const dt = new Date(y, m - 1, dd);
  return `${s}(${DOW[dt.getDay()]})`;
}

function kst(iso: string): Date | null {
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return null;
  return new Date(dt.getTime() + (dt.getTimezoneOffset() + 540) * 60000);
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const k = kst(iso);
  if (!k) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${k.getFullYear()}-${p(k.getMonth() + 1)}-${p(k.getDate())}(${DOW[k.getDay()]}) ${p(k.getHours())}:${p(k.getMinutes())}`;
}

export function fmtHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

export function fmtSlotTime(date: string, startHour: number, endHour?: number): string {
  return `${fmtDate(date)} ${fmtHour(startHour)}~${fmtHour(endHour ?? startHour + 1)}`;
}

export function won(n: number | null | undefined): string {
  return `${Number(n ?? 0).toLocaleString("ko-KR")}원`;
}

export function pct(n: number | null | undefined): string {
  return `${(Number(n ?? 0) * 100).toFixed(1)}%`;
}

export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const k = kst(iso);
  if (!k) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${k.getFullYear()}-${p(k.getMonth() + 1)}-${p(k.getDate())}T${p(k.getHours())}:${p(k.getMinutes())}`;
}

export function fromLocalInput(v: string): string {
  return v ? `${v}:00+09:00` : "";
}
