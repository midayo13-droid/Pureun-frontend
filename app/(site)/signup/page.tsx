"use client";
import Link from "next/link";
import { useState } from "react";
import { apiFetch, ApiError, errMsg } from "@/lib/api";
import { Field, Icon } from "@/components/ui";

const TYPES = ["일반 동호회", "장애인 단체", "국가유공자 단체", "구 소재 학교", "노인 단체"];
const STEPS = ["동의", "대표자", "단체", "인증"];

type Errs = Record<string, string>;

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [top, setTop] = useState("");
  const [errs, setErrs] = useState<Errs>({});
  const [f, setF] = useState({
    consent: false,
    repName: "",
    phone: "",
    password: "",
    passwordConfirm: "",
    orgName: "",
    orgType: TYPES[0],
    address: "",
    memberCount: "",
    residentCount: "",
    verifyCode: "",
  });
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const validate = (s: number): Errs => {
    const e: Errs = {};
    if (s === 1 && !f.consent) e.consent = "개인정보 처리에 동의해야 진행할 수 있습니다.";
    if (s === 2) {
      if (f.repName.trim().length < 2) e.repName = "성명은 2자 이상 입력해 주세요.";
      if (!/^010\d{8}$/.test(f.phone.replace(/\D/g, ""))) e.phone = "010으로 시작하는 11자리 숫자를 입력해 주세요.";
      if (!(f.password.length >= 8 && /[A-Za-z]/.test(f.password) && /\d/.test(f.password) && /[^A-Za-z0-9]/.test(f.password)))
        e.password = "비밀번호는 8자 이상이며 영문·숫자·특수문자를 모두 포함해야 합니다.";
      if (f.password !== f.passwordConfirm) e.passwordConfirm = "비밀번호 확인이 일치하지 않습니다.";
    }
    if (s === 3) {
      const m = Number(f.memberCount);
      const r = Number(f.residentCount);
      if (!f.orgName.trim()) e.orgName = "단체명을 입력해 주세요.";
      if (!f.address.trim()) e.address = "단체 주소를 입력해 주세요.";
      if (!(m >= 5)) e.memberCount = "5인 이상 단체만 신청할 수 있습니다.";
      if (f.residentCount === "" || r < 0) e.residentCount = "푸른구민 회원 수를 입력해 주세요.";
      else if (r > m) e.residentCount = "구민 회원 수는 전체 회원 수보다 클 수 없습니다.";
    }
    if (s === 4 && !/^\d{6}$/.test(f.verifyCode)) e.verifyCode = "6자리 숫자를 입력해 주세요.";
    return e;
  };

  const next = () => {
    const e = validate(step);
    setErrs(e);
    if (Object.keys(e).length === 0) setStep(step + 1);
  };

  const submit = async () => {
    if (busy) return;
    const e = validate(4);
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setTop("");
    try {
      await apiFetch("/auth/signup", {
        method: "POST",
        body: {
          repName: f.repName.trim(),
          phone: f.phone.replace(/\D/g, ""),
          password: f.password,
          passwordConfirm: f.passwordConfirm,
          privacyConsent: true,
          orgName: f.orgName.trim(),
          orgType: f.orgType,
          address: f.address.trim(),
          memberCount: Number(f.memberCount),
          residentCount: Number(f.residentCount),
          verifyCode: f.verifyCode,
        },
      });
      setDone(true);
    } catch (er) {
      if (er instanceof ApiError && er.fields) {
        setErrs(er.fields);
        const keys = Object.keys(er.fields);
        if (keys.some((k) => ["repName", "phone", "password", "passwordConfirm"].includes(k))) setStep(2);
        else if (keys.some((k) => ["orgName", "orgType", "address", "memberCount", "residentCount"].includes(k))) setStep(3);
      }
      setTop(errMsg(er));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="wrap">
        <div className="narrow card">
          <div className="done-icon">
            <Icon name="check" size={32} />
          </div>
          <h1>가입이 완료되었습니다</h1>
          <p style={{ margin: "12px 0 20px" }}>로그인한 뒤 시설을 선택하여 신청할 수 있습니다.</p>
          <Link href="/login" className="btn btn-primary btn-block">
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  const m = Number(f.memberCount);
  const r = Number(f.residentCount);
  const showResident = f.memberCount !== "" && f.residentCount !== "" && m > 0 && r >= 0 && r <= m;
  const isResident = showResident && r / m >= 0.5;

  return (
    <div className="wrap">
      <div className="narrow">
        <div className="page-title">
          <h1>회원가입</h1>
          <p>단체 대표자 계정을 만듭니다.</p>
        </div>
        <ol className="steps" aria-label="가입 단계">
          {STEPS.map((s, i) => (
            <li key={s} className={i + 1 <= step ? "on" : ""} aria-current={i + 1 === step ? "step" : undefined}>
              {i + 1}. {s}
            </li>
          ))}
        </ol>
        <div className="card">
          {top && (
            <div className="alert alert-danger" role="alert" style={{ marginBottom: 16 }}>
              {top}
            </div>
          )}
          {step === 1 && (
            <>
              <h2>개인정보 처리 동의</h2>
              <ul style={{ paddingLeft: 20, margin: "12px 0" }}>
                <li>수집 항목: 대표자 성명, 휴대전화, 단체명·유형·주소, 회원 수</li>
                <li>수집 목적: 시설 대관 신청 접수, 추첨 결과 안내, 요금 산정</li>
                <li>보유 기간: 가입 해지 시 또는 관련 규정이 정한 기간까지</li>
              </ul>
              <label className="check">
                <input type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} />
                <span>개인정보 처리에 동의합니다. (필수)</span>
              </label>
              {errs.consent && <p className="err">{errs.consent}</p>}
            </>
          )}
          {step === 2 && (
            <>
              <h2>대표자 정보</h2>
              <Field label="성명" htmlFor="repName" error={errs.repName}>
                <input id="repName" type="text" autoComplete="name" value={f.repName} onChange={(e) => set("repName", e.target.value)} aria-invalid={!!errs.repName} />
              </Field>
              <Field label="휴대전화" htmlFor="phone" error={errs.phone} help="숫자만 입력합니다. 예: 01012345678">
                <input id="phone" type="tel" inputMode="numeric" autoComplete="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!errs.phone} />
              </Field>
              <Field label="비밀번호" htmlFor="password" error={errs.password} help="8자 이상, 영문·숫자·특수문자를 모두 포함합니다.">
                <input id="password" type="password" autoComplete="new-password" value={f.password} onChange={(e) => set("password", e.target.value)} aria-invalid={!!errs.password} />
              </Field>
              <Field label="비밀번호 확인" htmlFor="passwordConfirm" error={errs.passwordConfirm}>
                <input id="passwordConfirm" type="password" autoComplete="new-password" value={f.passwordConfirm} onChange={(e) => set("passwordConfirm", e.target.value)} aria-invalid={!!errs.passwordConfirm} />
              </Field>
            </>
          )}
          {step === 3 && (
            <>
              <h2>단체 정보</h2>
              <Field label="단체명" htmlFor="orgName" error={errs.orgName}>
                <input id="orgName" type="text" value={f.orgName} onChange={(e) => set("orgName", e.target.value)} aria-invalid={!!errs.orgName} />
              </Field>
              <Field label="단체 유형" htmlFor="orgType" error={errs.orgType}>
                <select id="orgType" value={f.orgType} onChange={(e) => set("orgType", e.target.value)}>
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="단체 주소" htmlFor="address" error={errs.address} help="구 단위까지 입력합니다. 예: 푸른구 새롬동">
                <input id="address" type="text" value={f.address} onChange={(e) => set("address", e.target.value)} aria-invalid={!!errs.address} />
              </Field>
              <Field label="회원 수" htmlFor="memberCount" error={errs.memberCount} help="5명 이상이어야 합니다.">
                <input id="memberCount" type="number" min={0} inputMode="numeric" value={f.memberCount} onChange={(e) => set("memberCount", e.target.value)} aria-invalid={!!errs.memberCount} />
              </Field>
              <Field label="푸른구민 회원 수" htmlFor="residentCount" error={errs.residentCount}>
                <input id="residentCount" type="number" min={0} inputMode="numeric" value={f.residentCount} onChange={(e) => set("residentCount", e.target.value)} aria-invalid={!!errs.residentCount} />
              </Field>
              {showResident && (
                <div className={`alert ${isResident ? "alert-ok" : "alert-info"}`}>
                  {isResident ? "구민 단체로 구민 요금이 적용됩니다." : "비구민 단체로 비구민 요금이 적용됩니다."}
                </div>
              )}
            </>
          )}
          {step === 4 && (
            <>
              <h2>휴대전화 인증</h2>
              <p className="muted" style={{ marginBottom: 12 }}>
                시연용 화면입니다. 실제 문자는 발송되지 않으며, 안내된 시연용 인증번호를 입력합니다.
              </p>
              <Field label="인증번호 6자리" htmlFor="verifyCode" error={errs.verifyCode}>
                <input id="verifyCode" type="text" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={f.verifyCode} onChange={(e) => set("verifyCode", e.target.value)} aria-invalid={!!errs.verifyCode} />
              </Field>
            </>
          )}
          <div className="row" style={{ marginTop: 20 }}>
            {step > 1 && (
              <button type="button" className="btn btn-gray" onClick={() => setStep(step - 1)}>
                이전
              </button>
            )}
            {step < 4 ? (
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={next}>
                다음
              </button>
            ) : (
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={busy}>
                {busy ? "처리 중입니다" : "가입 완료"}
              </button>
            )}
          </div>
        </div>
        <p style={{ marginTop: 16 }}>
          이미 계정이 있다면 <Link href="/login">로그인</Link>
        </p>
      </div>
    </div>
  );
}
