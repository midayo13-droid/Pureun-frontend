"use client";
import { useCallback, useEffect, useState } from "react";
import { AUTH_EVENT } from "./api";

export type AuthState = { ready: boolean; token: string | null; role: string | null; name: string | null };

export function useAuth(): AuthState {
  const [s, setS] = useState<AuthState>({ ready: false, token: null, role: null, name: null });
  const read = useCallback(() => {
    try {
      setS({
        ready: true,
        token: localStorage.getItem("rental_token"),
        role: localStorage.getItem("rental_role"),
        name: localStorage.getItem("rental_name"),
      });
    } catch {
      setS({ ready: true, token: null, role: null, name: null });
    }
  }, []);
  useEffect(() => {
    read();
    window.addEventListener(AUTH_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(AUTH_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, [read]);
  return s;
}

/** 토큰이 없으면 /login 으로 보낸다. 준비·로그인 여부를 반환. */
export function useRequireLogin(): { ok: boolean } {
  const a = useAuth();
  useEffect(() => {
    if (a.ready && !a.token) window.location.replace("/login");
  }, [a.ready, a.token]);
  return { ok: a.ready && !!a.token };
}
