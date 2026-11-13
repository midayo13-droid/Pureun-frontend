"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError, errMsg } from "@/lib/api";
import { useRequireLogin } from "@/lib/auth";
import { fmtDate, fmtMD, fmtSlotTime, fmtWon, loadSlots, saveSlots, type Intake, type SelectedSlot } from "@/lib/format";
import { ErrorBox, Field, Icon, Loading } from "@/components/ui";

type Me = { org: { orgName: string; orgType: string; address: string; memberCount: number; residentCount: number; isResidentOrg: boolean } | null };
type Quote = {
  isResidentOrg: boolean;
  items: { slot: { facilityId: number; date: string; startHour: number }; pricePerHour: number; amount: number }[];
  grossAmount: number;
  discountRate: number;
  expectedDiscountAmount: number;
  expectedNetAmount: number;
  noteText?: string;
};
type Done = { applicationId: number; applicationNo: string; announceAt: string; evidenceFailed: boolean };

const DISCOUNTS = ["장애인 단체", "국가유공자 단체", "구 소재 학교", "노인 단체"];
const OK_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export default function ApplyPage() {
  const { ok } = useRequireLogin();
  const [slots, setSlots] = useState<SelectedSlot[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [mc, setMc] = useState("");
  const [rc, setRc] = useState("");
  const [disc, setDisc] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileErr, setFileErr] = useState("");
  const [consent, setConsent] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteErr, setQuoteErr] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Done | null>(null);

  const init = useCallback(async () => {
    setLoading(true);
    setLoadErr("");
    try {
      const [m, i] = await Promise.all([apiFetch<Me>("/auth/me"), apiFetch<Intake>("/intake/current")]);
      setMe(m);
      setIntake(i);
      if (m.org) {
        setMc(String(m.org.memberCount));
        setRc(String(m.org.residentCount));
      }
      setSlots(loadSlots());
    } catch (e) {
      setLoadErr(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (ok) init();
  }, [ok, init]);

  const m = Number(mc);
  const r = Number(rc);
  const countsOk = mc !== "" && rc !== "" && m >= 5 && r >= 0 && r <= m;
  const resident = countsOk ? r / m >= 0.5 : null;

  useEffect(() => {
    if (!ok || loading || slots.length === 0) {
      setQuote(null);
      return;
    }
    let cancel = false;
    setQuoting(true);
    setQuoteErr("");
    apiFetch<Quote>("/quote", {
      method: "POST",
      body: {
        slots: slots.map((s) => ({ facilityId: s.facilityId, date: s.date, startHour: s.startHour })),
        discountType: disc || undefined,
        memberCount: countsOk ? m : undefined,
        residentCount: countsOk ? r : undefined,
      },
    })
      .then((q) => !cancel && setQuote(q))
      .catch((e) => {
        if (!cancel) {
          setQuote(null);
          setQuoteErr(errMsg(e));
        }
      })
      .finally(() => !cancel && setQuoting(false));
    return () => {
      cancel = true;
    };
  }, [ok, loading, slots, disc, mc, rc, countsOk, m, r]);

  const removeSlot = (i: number) => {
    const n = slots.filter((_, j) => j !== i);
    setSlots(n);
    saveSlots(n);
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    let e = "";
    for (const f of Array.from(list)) {
      if (!OK_TYPES.includes(f.type) || f.size > 10 * 1024 * 1024) {
        e = "PDF, JPG, PNG 파일만 올릴 수 있고 파일당 10MB까지입니다.";
        continue;
      }
      if (next.length >= 3) {
        e = "증빙 서류는 최대 3개까지 올릴 수 있습니다.";
        break;
      }
      next.push(f);
    }
    setFileErr(e);
    setFiles(next);
  };

  const submit = async () => {
    if (busy) return;
    const fe: Record<string, string> = {};
    if (slots.length === 0) setSubmitErr("선택한 시간이 없습니다. 시설·시간 현황에서 시간을 선택해 주세요.");
    if (!consent) fe.consent = "개인정보 처리에 동의해야 진행할 수 있습니다.";
    if (mc !== "" && m < 5) fe.mc = "5인 이상 단체만 신청할 수 있습니다.";
    else if (r > m) fe.rc = "구민 회원 수는 전체 회원 수보다 클 수 없습니다.";
    if (disc && files.length === 0) fe.disc = "감면을 신청하려면 증빙 서류를 올려야 합니다.";
    setFieldErrs(fe);
    if (slots.length === 0 || Object.keys(fe).length) return;
    setBusy(true);
    setSubmitErr("");
    try {
      const res = await apiFetch<{ applicationId: number; applicationNo: string; announceAt: string }>("/applications", {
        method: "POST",
        body: {
          slots: slots.map((s) => ({ facilityId: s.facilityId, date: s.date, startHour: s.startHour })),
          discountType: disc || undefined,
          privacyConsent: true,
          memberCount: countsOk ? m : undefined,
          residentCount: countsOk ? r : undefined,
        },
      });
      let failed = false;
      if (disc) {
        for (const f of files) {
          const fd = new FormData();
          fd.append("file", f);
          try {
            await apiFetch(`/applications/${res.applicationId}/evidence`, { method: "POST", formData: fd });
          } catch {
            failed = true;
          }
        }
      }
      saveSlots([]);
      setDone({ ...res, evidenceFailed: failed });
    } catch (e) {
      if (e instanceof ApiError && e.fields) setFieldErrs((p) => ({ ...p, ...e.fields }));
      setSubmitErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (!ok || loading) return <div className="wrap"><Loading /></div>;
  if (loadErr) return <div className="wrap"><ErrorBox message={loadErr} onRetry={init} /></div>;

  if (done) {
    return (
      <div className="wrap">
        <div className="narrow card">
          <div className="done-icon"><Icon name="check" size={32} /></div>
          <h1>신청이 접수되었습니다</h1>
          <dl className="kv" style={{ margin: "16px 0" }}>
            <dt>접수번호</dt><dd><strong>{done.applicationNo}</strong></dd>
            <dt>결과 발표</dt><dd>{fmtMD(done.announceAt)}까지 내 신청·결과에서 확인합니다.</dd>
          </dl>
          {done.evidenceFailed && (
            <div className="alert alert-warn" role="alert" style={{ marginBottom: 16 }}>
              일부 증빙 서류를 올리지 못했습니다. 내 신청 상세에서 다시 올려 주세요.
            </div>
          )}
          <p className="muted" style={{ marginBottom: 16 }}>일부 시간만 당첨될 수 있습니다.</p>
          <Link href={`/my/${done.applicationId}`} className="btn btn-primary btn-block">신청 내역 보기</Link>
        </div>
      </div>
    );
  }

  const notOpen = intake && intake.status !== "접수중";

  return (
    <div className="wrap">
      <div className="page-title">
        <h1>신청서 작성</h1>
        <p>선택한 시간과 단체 정보를 확인한 뒤 제출합니다.</p>
      </div>
      {notOpen && (
        <div className="alert alert-warn" style={{ marginBottom: 16 }}>
          접수 기간이 아닙니다. 접수는 {fmtMD(intake!.openAt)}부터 {fmtMD(intake!.closeAt)}까지입니다.
        </div>
      )}
      <div className="apply-layout">
        <div>
          <section className="card" aria-labelledby="s-slot">
            <h2 id="s-slot">선택한 시간 ({slots.length}개)</h2>
            {slots.length === 0 ? (
              <p>
                선택한 시간이 없습니다. <Link href="/facilities">시설·시간 현황</Link>에서 시간을 선택해 주세요.
              </p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }} className="basket">
                {slots.map((s, i) => (
                  <li key={`${s.facilityId}${s.date}${s.startHour}`}>
                    <span>{s.facilityName} {fmtDate(s.date)} {fmtSlotTime(s.startHour)}</span>
                    <button type="button" className="x" onClick={() => removeSlot(i)}>삭제</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card" aria-labelledby="s-org">
            <h2 id="s-org">단체 정보</h2>
            {me?.org ? (
              <dl className="kv" style={{ marginBottom: 16 }}>
                <dt>단체명</dt><dd>{me.org.orgName}</dd>
                <dt>단체 유형</dt><dd>{me.org.orgType}</dd>
                <dt>주소</dt><dd>{me.org.address}</dd>
              </dl>
            ) : (
              <p className="muted" style={{ marginBottom: 12 }}>단체 정보를 불러오지 못했습니다.</p>
            )}
            <Field label="회원 수" htmlFor="mc" error={fieldErrs.mc || fieldErrs.memberCount}>
              <input id="mc" type="number" min={0} value={mc} onChange={(e) => setMc(e.target.value)} aria-invalid={!!fieldErrs.mc} />
            </Field>
            <Field label="푸른구민 회원 수" htmlFor="rc" error={fieldErrs.rc || fieldErrs.residentCount}>
              <input id="rc" type="number" min={0} value={rc} onChange={(e) => setRc(e.target.value)} aria-invalid={!!fieldErrs.rc} />
            </Field>
            {resident != null && (
              <div className={`alert ${resident ? "alert-ok" : "alert-info"}`}>
                {resident ? "구민 단체입니다. 구민 요금이 적용됩니다." : "비구민 단체입니다. 비구민 요금이 적용됩니다."}
              </div>
            )}
          </section>

          <section className="card" aria-labelledby="s-disc">
            <h2 id="s-disc">감면</h2>
            <Field label="감면 대상" htmlFor="disc" error={fieldErrs.disc || fieldErrs.discountType} help="감면은 증빙 서류를 담당자가 승인한 뒤 적용됩니다.">
              <select id="disc" value={disc} onChange={(e) => setDisc(e.target.value)}>
                <option value="">없음</option>
                {DISCOUNTS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
            {disc && (
              <div className="field">
                <label htmlFor="ev">증빙 서류</label>
                <input id="ev" type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                <p className="help">PDF, JPG, PNG 파일 / 파일당 10MB / 최대 3개</p>
                {fileErr && <p className="err">{fileErr}</p>}
                {files.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }} className="basket">
                    {files.map((f, i) => (
                      <li key={f.name + i}>
                        <span>{f.name}</span>
                        <button type="button" className="x" onClick={() => setFiles(files.filter((_, j) => j !== i))}>삭제</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          <section className="card" aria-labelledby="s-agree">
            <h2 id="s-agree">안내와 동의</h2>
            <div className="alert alert-info" style={{ marginBottom: 12 }}>
              일부 시간만 당첨될 수 있습니다. 결과는 {intake ? fmtMD(intake.announceAt) : "발표일"}까지 내 신청·결과에서 확인합니다.
            </div>
            <label className="check">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>개인정보 처리에 동의합니다. (필수)</span>
            </label>
            {fieldErrs.consent && <p className="err">{fieldErrs.consent}</p>}
          </section>
        </div>

        <aside className="card sum" aria-labelledby="s-sum">
          <h2 id="s-sum">요금 미리보기</h2>
          {quoting && <Loading text="요금을 계산하고 있습니다." />}
          {quoteErr && <ErrorBox message={quoteErr} />}
          {!quoting && slots.length === 0 && <p className="muted">시간을 선택하면 요금이 표시됩니다.</p>}
          {quote && !quoting && (
            <>
              <table className="tbl">
                <tbody>
                  {quote.items.map((it, i) => (
                    <tr key={i}>
                      <td>{fmtDate(it.slot.date)} {fmtSlotTime(it.slot.startHour)}</td>
                      <td className="num">{fmtWon(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="row between" style={{ marginTop: 10 }}><span>대관료</span><strong>{fmtWon(quote.grossAmount)}</strong></div>
              {disc && (
                <p className="muted" style={{ marginTop: 6 }}>
                  감면은 담당자 승인 후 적용됩니다. 승인되면 예상 감면액 {fmtWon(quote.expectedDiscountAmount)}({Math.round(quote.discountRate * (quote.discountRate <= 1 ? 100 : 1))}%)이 반영되어 {fmtWon(quote.expectedNetAmount)}입니다.
                </p>
              )}
              <div className="total"><span>청구 예정액</span><span>{fmtWon(quote.grossAmount)}</span></div>
              {quote.noteText && <p className="muted" style={{ marginTop: 8 }}>{quote.noteText}</p>}
            </>
          )}
          {submitErr && <div style={{ marginTop: 12 }}><ErrorBox message={submitErr} /></div>}
          <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={submit} disabled={busy || slots.length === 0}>
            {busy ? "제출 중입니다" : "신청 제출"}
          </button>
        </aside>
      </div>
    </div>
  );
}
