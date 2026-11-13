"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, errMsg } from "@/lib/api";
import { useRequireLogin } from "@/lib/auth";
import { fmtDate, fmtDateTime, fmtSlotTime, fmtWon } from "@/lib/format";
import { Badge, ErrorBox, Loading } from "@/components/ui";

type Detail = {
  applicationId: number;
  applicationNo: string;
  appliedAt: string;
  via: string;
  status: string;
  discountType: string | null;
  evidence: { evidenceId: number; status: string; rejectReason: string | null }[];
  resultPublished: boolean;
  slots: {
    slotId: number;
    facilityName: string;
    date: string;
    startHour: number;
    result: string;
    reasonText: string | null;
    pricePerHour: number;
    discountAmount: number;
    netAmount: number;
  }[];
  totals: { grossAmount: number; discountAmount: number; netAmount: number };
};
type Refund = { refundRate: number; refundAmount: number; rule: string };

const resTone = (r: string) => (r === "당첨" ? "green" : r === "탈락" ? "red" : r === "취소" ? "gray" : "blue");
const evTone = (s: string) => (s === "승인" ? "green" : s === "반려" ? "red" : "orange");

export default function MyDetail() {
  const { ok } = useRequireLogin();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [refund, setRefund] = useState<Refund | null>(null);
  const [refundErr, setRefundErr] = useState("");
  const [upErr, setUpErr] = useState("");
  const [upBusy, setUpBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setErr("");
    try {
      setD(await apiFetch<Detail>(`/applications/me/${id}`));
    } catch (e) {
      setErr(errMsg(e));
    }
  }, [id]);
  useEffect(() => {
    if (ok) load();
  }, [ok, load]);

  const reupload = async (f: File | undefined) => {
    if (!f || !id || upBusy) return;
    if (!["application/pdf", "image/jpeg", "image/png"].includes(f.type) || f.size > 10 * 1024 * 1024) {
      setUpErr("PDF, JPG, PNG 파일만 올릴 수 있고 파일당 10MB까지입니다.");
      return;
    }
    setUpBusy(true);
    setUpErr("");
    try {
      const fd = new FormData();
      fd.append("file", f);
      await apiFetch(`/applications/${id}/evidence`, { method: "POST", formData: fd });
      await load();
    } catch (e) {
      setUpErr(errMsg(e));
    } finally {
      setUpBusy(false);
    }
  };

  const estimate = async () => {
    if (!d) return;
    setRefundErr("");
    setRefund(null);
    const first = d.slots.map((s) => s.date).sort()[0];
    try {
      setRefund(await apiFetch<Refund>("/refund/estimate", { method: "POST", body: { netAmount: d.totals.netAmount, useDate: first } }));
    } catch (e) {
      setRefundErr(errMsg(e));
    }
  };

  if (!ok || (!d && !err)) return <div className="wrap"><Loading /></div>;
  if (err) return <div className="wrap"><ErrorBox message={err} onRetry={load} /><p style={{ marginTop: 16 }}><Link href="/my">목록으로</Link></p></div>;
  if (!d) return null;

  const latestEv = d.evidence.length ? d.evidence[d.evidence.length - 1] : null;
  const evLabel = latestEv ? (latestEv.status === "대기" ? "승인 대기" : latestEv.status) : null;

  return (
    <div className="wrap">
      <p style={{ marginBottom: 8 }}><Link href="/my">내 신청·결과 목록</Link></p>
      <div className="page-title">
        <h1>{d.applicationNo}</h1>
        <p>접수일시 {fmtDateTime(d.appliedAt)} · {d.via === "visit" || d.via === "방문" ? "방문 접수" : "온라인 접수"}</p>
      </div>

      {!d.resultPublished && <div className="alert alert-info" style={{ marginBottom: 16 }}>추첨 결과는 발표 전입니다. 슬롯 결과는 추첨 대기로 표시됩니다.</div>}

      <section className="card" aria-labelledby="d-slots">
        <h2 id="d-slots">슬롯별 결과</h2>
        <table className="tbl stack-m">
          <thead>
            <tr><th>시설</th><th>날짜·시간</th><th>결과</th><th className="num">시간당 요금</th><th className="num">감면액</th><th className="num">청구액</th></tr>
          </thead>
          <tbody>
            {d.slots.map((s) => (
              <tr key={s.slotId}>
                <td data-l="시설">{s.facilityName}</td>
                <td data-l="일시">{fmtDate(s.date)} {fmtSlotTime(s.startHour)}</td>
                <td>
                  <Badge tone={resTone(s.result)}>{s.result === "대기" ? "추첨 대기" : s.result}</Badge>
                  {s.reasonText && <div className="muted" style={{ marginTop: 4 }}>{s.reasonText}</div>}
                </td>
                <td className="num" data-l="시간당">{fmtWon(s.pricePerHour)}</td>
                <td className="num" data-l="감면">{fmtWon(s.discountAmount)}</td>
                <td className="num" data-l="청구">{fmtWon(s.netAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="kv" style={{ marginTop: 16 }}>
          <dt>대관료</dt><dd>{fmtWon(d.totals.grossAmount)}</dd>
          <dt>감면액</dt><dd>{fmtWon(d.totals.discountAmount)}</dd>
          <dt>청구액</dt><dd><strong>{fmtWon(d.totals.netAmount)}</strong></dd>
        </dl>
        {d.totals.discountAmount > 0 && <div className="alert alert-ok" style={{ marginTop: 12 }}>감면이 반영되었습니다.</div>}
      </section>

      {d.discountType && (
        <section className="card" aria-labelledby="d-disc">
          <h2 id="d-disc">감면 확인 상태</h2>
          <p>
            감면 대상 {d.discountType} · {evLabel ? <Badge tone={evTone(latestEv!.status)}>{evLabel}</Badge> : <Badge tone="orange">증빙 없음</Badge>}
          </p>
          {d.discountType && !latestEv && <p className="muted" style={{ marginTop: 8 }}>감면 승인 전에는 감면 없는 금액이 청구 예정입니다.</p>}
          {latestEv?.status === "반려" && (
            <div style={{ marginTop: 12 }}>
              <p className="err">반려 사유: {latestEv.rejectReason || "사유가 기록되지 않았습니다."}</p>
              <div className="field" style={{ marginTop: 12 }}>
                <label htmlFor="reup">증빙 다시 올리기</label>
                <input id="reup" type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={upBusy} onChange={(e) => { reupload(e.target.files?.[0]); e.target.value = ""; }} />
                <p className="help">PDF, JPG, PNG 파일 / 파일당 10MB</p>
                {upErr && <p className="err">{upErr}</p>}
              </div>
            </div>
          )}
          {latestEv?.status !== "반려" && upErr && <p className="err">{upErr}</p>}
        </section>
      )}

      <section className="card" aria-labelledby="d-refund">
        <h2 id="d-refund">환불 안내</h2>
        <p className="muted" style={{ marginBottom: 12 }}>실제 취소와 환불 처리는 추후 제공합니다. 취소 시 예상 환불액만 안내합니다.</p>
        <button type="button" className="btn btn-secondary" onClick={estimate}>취소하면 환불은 얼마인가요?</button>
        {refundErr && <div style={{ marginTop: 12 }}><ErrorBox message={refundErr} /></div>}
        {refund && (
          <table className="tbl" style={{ marginTop: 12 }}>
            <tbody>
              <tr><th>환불율</th><td>{refund.refundRate <= 1 ? Math.round(refund.refundRate * 100) : refund.refundRate}%</td></tr>
              <tr><th>환불 예상액</th><td>{fmtWon(refund.refundAmount)}</td></tr>
              <tr><th>적용 기준</th><td>{refund.rule}</td></tr>
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
