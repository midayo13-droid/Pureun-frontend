"use client";
import { useState } from "react";
import { useLoad } from "../_lib/useLoad";
import { adminFetch, ApiError, errMsg, fmtDate } from "../_lib/api";
import { Alert, Confirm, Empty, ErrorBox, Field, Loading, PageHead, Table } from "../_components/ui";

type Fac = { facilityId: number; name: string };
type B = { blackoutId: number; facilityId: number | null; facilityName: string; startDate: string; endDate: string; reasonType: string; reason: string; affectedSlots: number };

export default function BlackoutsPage() {
  const { data, error, loading, reload } = useLoad<B[]>("/admin/blackouts");
  const facs = useLoad<Fac[]>("/facilities");
  const [facilityId, setFacilityId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reasonType, setReasonType] = useState("공사");
  const [reason, setReason] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ k: "ok" | "error" | "warn"; t: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<B | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const fe: Record<string, string> = {};
    if (!startDate) fe.startDate = "시작일을 입력해 주세요.";
    if (!endDate) fe.endDate = "종료일을 입력해 주세요.";
    if (startDate && endDate && endDate < startDate) fe.endDate = "종료일은 시작일 이후여야 합니다.";
    if (!reason.trim()) fe.reason = "사유를 입력해 주세요.";
    setErrs(fe);
    if (Object.keys(fe).length) return;
    setBusy(true);
    setMsg([]);
    try {
      const r = await adminFetch<B & { warning?: string }>("/admin/blackouts", {
        method: "POST",
        body: JSON.stringify({ facilityId: facilityId === "all" ? null : Number(facilityId), startDate, endDate, reasonType, reason: reason.trim() }),
      });
      const m: { k: "ok" | "error" | "warn"; t: string }[] = [{ k: "ok", t: "이용 불가일을 등록했습니다." }];
      if (r?.affectedSlots) m.push({ k: "warn", t: `이미 신청·당첨된 슬롯 ${r.affectedSlots}건이 영향을 받습니다. 취소·환불·재배정 절차는 별도로 진행해 주세요.` });
      if (r?.warning) m.push({ k: "warn", t: r.warning });
      setMsg(m);
      setReason("");
      reload();
    } catch (er) {
      if (er instanceof ApiError && er.fields) setErrs(er.fields);
      setMsg([{ k: "error", t: errMsg(er) }]);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!del) return;
    setBusy(true);
    try {
      await adminFetch(`/admin/blackouts/${del.blackoutId}`, { method: "DELETE" });
      setMsg([{ k: "ok", t: "이용 불가일을 삭제했습니다. 해당 날짜의 차단이 해제됩니다." }]);
      setDel(null);
      reload();
    } catch (er) {
      setMsg([{ k: "error", t: errMsg(er) }]);
      setDel(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title="이용 불가일 관리" desc="공사·행사·안전점검·휴관일을 등록해 신청을 막습니다." />
      {msg.map((m, i) => <Alert key={i} kind={m.k}>{m.t}</Alert>)}
      <form className="adm-card" onSubmit={submit} noValidate>
        <h2>이용 불가일 등록</h2>
        <div className="adm-form">
          <Field label="시설" required>
            <select className="adm-select" value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
              <option value="all">전체</option>
              {(facs.data || []).map((f) => <option key={f.facilityId} value={f.facilityId}>{f.name}</option>)}
            </select>
          </Field>
          <Field label="시작일" required error={errs.startDate}><input type="date" className="adm-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          <Field label="종료일" required error={errs.endDate}><input type="date" className="adm-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
          <Field label="사유 분류" required>
            <select className="adm-select" value={reasonType} onChange={(e) => setReasonType(e.target.value)}>
              {["공사", "행사", "안전점검", "휴관"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="사유" required error={errs.reason}><input className="adm-input" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        </div>
        <button className="adm-btn primary" type="submit" disabled={busy}>{busy ? "처리 중..." : "등록"}</button>
      </form>
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data || data.length === 0 ? <Empty text="등록된 이용 불가일이 없습니다." /> : (
        <Table>
          <thead><tr><th>시설</th><th>기간</th><th>분류</th><th>사유</th><th className="num">영향 슬롯</th><th>삭제</th></tr></thead>
          <tbody>
            {data.map((b) => (
              <tr key={b.blackoutId}>
                <td>{b.facilityName || "전체"}</td>
                <td>{fmtDate(b.startDate)}{b.endDate !== b.startDate ? ` ~ ${fmtDate(b.endDate)}` : ""}</td>
                <td>{b.reasonType}</td>
                <td>{b.reason}</td>
                <td className="num">{b.affectedSlots}건</td>
                <td><button className="adm-btn small danger" onClick={() => setDel(b)}>삭제</button></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {del && <Confirm title="이용 불가일 삭제" message={`${fmtDate(del.startDate)} ${del.facilityName || "전체"} ${del.reasonType}을(를) 삭제합니다. 해당 날짜의 차단이 풀립니다. 삭제할까요?`} confirmText="삭제" busy={busy} onConfirm={remove} onCancel={() => setDel(null)} />}
    </>
  );
}
