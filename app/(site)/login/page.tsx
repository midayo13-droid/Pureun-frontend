"use client";
import Link from "next/link";
import { useState } from "react";
import { apiFetch, errMsg, saveLogin, ApiError } from "@/lib/api";
import { Field } from "@/components/ui";

type LoginRes = { token: string; user: { role: string; repName: string; orgName: string | null } };

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!phone || !pw) {
      setErr("휴대전화 번호와 비밀번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const r = await apiFetch<LoginRes>("/auth/login", { method: "POST", body: { phone: phone.replace(/\D/g, ""), password: pw } });
      saveLogin(r.token, r.user.role, r.user.repName);
      window.location.href = r.user.role === "admin" ? "/admin" : "/";
    } catch (e) {
      setErr(e instanceof ApiError && e.statusCode === 401 ? "휴대전화 번호 또는 비밀번호가 올바르지 않습니다." : errMsg(e));
      setBusy(false);
    }
  };

  return (
    <div className="wrap">
      <div className="narrow">
        <div className="page-title">
          <h1>로그인</h1>
          <p>신청자와 관리자 모두 휴대전화 번호로 로그인합니다.</p>
        </div>
        <form className="card" onSubmit={submit} noValidate>
          <Field label="휴대전화 번호" htmlFor="phone">
            <input id="phone" type="tel" inputMode="numeric" autoComplete="username" placeholder="01012345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="비밀번호" htmlFor="pw">
            <input id="pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
          {err && (
            <div className="alert alert-danger" role="alert" style={{ marginBottom: 16 }}>
              {err}
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "확인 중입니다" : "로그인"}
          </button>
          <p className="muted" style={{ marginTop: 16 }}>
            비밀번호를 잊으셨다면 센터 담당자에게 문의합니다. 재설정은 추후 제공합니다.
          </p>
          <p style={{ marginTop: 12 }}>
            아직 계정이 없다면 <Link href="/signup">회원가입</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
