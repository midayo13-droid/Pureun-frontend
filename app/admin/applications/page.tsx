"use client";
import { useState } from "react";
import { useLoad } from "../_lib/useLoad";
import { adminFetch, ApiError, errMsg, fmtDate, fmtDateTime, fmtSlotTime, won } from "../_lib/api";
import { Alert, Badge, Empty, ErrorBox, Field, Loading, Modal, PageHead, Table } from "../_components/ui";

type Period = { periodId: number; targetMonth: string; status: string };
type App = { applicationId: number; applicationNo: string; orgName: string; repNameMasked: string; phoneMasked: string; appliedAt: string; slotCount: number; via: string; discountType: string | null; status: string };
type DetailSlot = { facilityName?: string; facilityId?: number; date: string; startHour: number; result?: string; netAmount?: number };
type Detail = App & { repName?: string; phone?: string; slots?: DetailSlot[]; totals?: { netAmount?: number } };
type Fac = { facilityId: number; name: string };
type Org = { orgId: number; orgName: string; orgType: string; repNameMasked: string };
type Cal = { days: { date: string; blackout: unknown; slots: { hour: number; state: string }[] }[] };
type Slot = { facilityId: number; date: string; startHour: number };

const ORG_TYPES = ["일반 동호회", "장애인 단체", "국가유공자 단체", "구 소재 학교", "노인 단체"];
const DISCOUNTS = ["", "장애인 단체", "국가유공자 단체", "구 소재 학교", "노인 단체"];

function DetailView({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, error, loading, reload } = useLoad<Detail>(`/admin/applications/${id}`);
  return (
    <Modal title="신청 상세" onClose={onClose} wide>
      <Alert kind="info">상세를 열면 열람 계정과 일시가 기록됩니다.</Alert>
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : data && (
        <>
          <dl className="adm-kv">
            <dt>접수번호</dt><dd>{data.applicationNo}</dd>
            <dt>단체명</dt><dd>{data.orgName}</dd>
            <dt>대표자</dt><dd>{data.repName || data.repNameMasked}</dd>
            <dt>연락처</dt><dd>{data.phone || data.phoneMasked}</dd>
            <dt>접수일시</dt><dd>{fmtDateTime(data.appliedAt)}</dd>
            <dt>경로</dt><dd>{data.via === "visit" ? "방문" : "온라인"}</dd>
            <dt>감면 유형</dt><dd>{data.discountType || "없음"}</dd>
            <dt>상태</dt><dd><Badge>{data.status}</Badge></dd>
            {data.totals?.netAmount !== undefined && (<><dt>청구 예정액</dt><dd>{won(data.totals.netAmount)}</dd></>)}
          </dl>
          {data.slots && data.slots.length > 0 ? (
            <Table>
              <thead><tr><th>시설</th><th>날짜·시간</th><th>결과</th></tr></thead>
              <tbody>
                {data.slots.map((s, i) => (
                  <tr key={i}><td>{s.facilityName ?? s.facilityId}</td><td>{fmtSlotTime(s.date, s.startHour)}</td><td>{s.result ? <Badge>{s.result}</Badge> : "-"}</td></tr>
                ))}
              </tbody>
            </Table>
          ) : <Empty text="슬롯 정보가 없습니다." />}
        </>
      )}
    </Modal>
  );
}

function SlotPicker({ slots, onChange }: { slots: Slot[]; onChange: (s: Slot[]) => void }) {
  const facs = useLoad<Fac[]>("/facilities");
  const period = useLoad<{ targetMonth?: string } | null>("/intake/current");
  const [facId, setFacId] = useState("");
  const [month, setMonth] = useState("");
  const [date, setDate] = useState("");
  const fid = facId || (facs.data?.[0] ? String(facs.data[0].facilityId) : "");
  const mon = month || period.data?.targetMonth || "";
  const cal = useLoad<Cal>(fid && /^\d{4}-\d{2}$/.test(mon) ? `/calendar?facilityId=${fid}&month=${mon}` : null);
  const day = cal.data?.days.find((d) => d.date === date);
  const has = (h: number) => slots.some((s) => s.facilityId === Number(fid) && s.date === date && s.startHour === h);
  const toggle = (h: number) => {
    const s = { facilityId: Number(fid), date, startHour: h };
    onChange(has(h) ? slots.filter((x) => !(x.facilityId === s.facilityId && x.date === s.date && x.startHour === h)) : [...slots, s]);
  };
  const facName = (id: number) => facs.data?.find((f) => f.facilityId === id)?.name ?? id;
  return (
    <div>
      <div className="adm-form">
        <Field label="시설"><select className="adm-select" value={fid} onChange={(e) => { setFacId(e.target.value); setDate(""); }}>{(facs.data || []).map((f) => <option key={f.facilityId} value={f.facilityId}>{f.name}</option>)}</select></Field>
        <Field label="이용 월"><input type="month" className="adm-input" value={mon} onChange={(e) => { setMonth(e.target.value); setDate(""); }} /></Field>
        <Field label="날짜">
          <select className="adm-select" value={date} onChange={(e) => setDate(e.target.value)} disabled={!cal.data}>
            <option value="">날짜 선택</option>
            {(cal.data?.days || []).filter((d) => !d.blackout).map((d) => <option key={d.date} value={d.date}>{fmtDate(d.date)}</option>)}
          </select>
        </Field>
      </div>
      {cal.error && <ErrorBox message={cal.error} onRetry={cal.reload} />}
      {day && (
        <div className="adm-slotgrid" style={{ marginBottom: 12 }}>
          {day.slots.map((s) => (
            <button key={s.hour} type="button" className={`adm-slot${has(s.hour) ? " sel" : ""}`} disabled={s.state !== "available"} aria-pressed={has(s.hour)} onClick={() => toggle(s.hour)}>
              {String(s.hour).padStart(2, "0")}:00
            </button>
          ))}
        </div>
      )}
      <div>
        <strong style={{ fontSize: 15 }}>선택한 슬롯 {slots.length}개</strong>
        {slots.length > 0 && (
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 15 }}>
            {slots.map((s, i) => (
              <li key={i}>{facName(s.facilityId)} {fmtSlotTime(s.date, s.startHour)}{" "}
                <button type="button" className="adm-btn small" onClick={() => onChange(slots.filter((_, j) => j !== i))}>삭제</button></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function VisitForm({ onClose, onDone }: { onClose: () => void; onDone: (m: string) => void }) {
  const [mode, setMode] = useState<"search" | "new">("search");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const orgs = useLoad<Org[]>(mode === "search" && q ? `/admin/orgs?search=${encodeURIComponent(q)}` : null);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [no, setNo] = useState({ repName: "", phone: "", orgName: "", orgType: ORG_TYPES[0], address: "", memberCount: "", residentCount: "" });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [discount, setDiscount] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const setN = (k: keyof typeof no) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setNo({ ...no, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const fe: Record<string, string> = {};
    if (mode === "search" && orgId === null) fe.org = "단체를 검색해 선택해 주세요.";
    if (mode === "new") {
      (["repName", "phone", "orgName", "address"] as const).forEach((k) => { if (!no[k].trim()) fe[k] = "필수 입력입니다."; });
      if (!no.memberCount || Number(no.memberCount) < 1) fe.memberCount = "회원 수를 입력해 주세요.";
      if (no.residentCount === "" || Number(no.residentCount) < 0) fe.residentCount = "구민 회원 수를 입력해 주세요.";
      else if (Number(no.residentCount) > Number(no.memberCount)) fe.residentCount = "구민 회원 수는 전체 회원 수를 넘을 수 없습니다.";
    }
    if (slots.length === 0) fe.slots = "슬롯을 하나 이상 선택해 주세요.";
    if (!confirmed) fe.confirmed = "신청자 확인이 필요합니다.";
    if (!privacy) fe.privacy = "개인정보 수집·이용 동의 확인이 필요합니다.";
    setErrs(fe);
    setErr("");
    if (Object.keys(fe).length) return;
    setBusy(true);
    try {
      const body: Record<string, unknown> = { slots, discountType: discount || undefined, applicantConfirmed: true, privacyConsent: true };
      if (mode === "search") body.orgId = orgId;
      else body.newOrg = { ...no, memberCount: Number(no.memberCount), residentCount: Number(no.residentCount) };
      const r = await adminFetch<{ applicationNo?: string }>("/admin/applications", { method: "POST", body: JSON.stringify(body) });
      onDone(`방문 신청을 저장했습니다.${r?.applicationNo ? ` 접수번호 ${r.applicationNo}` : ""}`);
    } catch (er) {
      if (er instanceof ApiError && er.fields) setErrs(er.fields);
      setErr(errMsg(er));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="방문 신청 대리 입력" onClose={onClose} wide>
      <form onSubmit={submit} noValidate>
        {err && <Alert kind="error">{err}</Alert>}
        <h2>단체</h2>
        <div className="adm-row" style={{ marginBottom: 12 }}>
          <label className="adm-check"><input type="radio" checked={mode === "search"} onChange={() => setMode("search")} />등록된 단체 검색</label>
          <label className="adm-check"><input type="radio" checked={mode === "new"} onChange={() => setMode("new")} />새 단체 등록</label>
        </div>
        {mode === "search" ? (
          <div style={{ marginBottom: 16 }}>
            <div className="adm-row" style={{ alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: 200 }}><Field label="단체명 검색"><input className="adm-input" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setQ(search.trim()); } }} /></Field></div>
              <button type="button" className="adm-btn" onClick={() => setQ(search.trim())}>검색</button>
            </div>
            {orgs.loading && q && !orgs.data ? <Loading /> : orgs.error ? <ErrorBox message={orgs.error} /> : orgs.data && (orgs.data.length === 0 ? <Empty text="검색 결과가 없습니다." /> : (
              <div style={{ marginTop: 8 }}>
                {orgs.data.map((o) => (
                  <label key={o.orgId} className="adm-check" style={{ padding: "6px 0" }}>
                    <input type="radio" name="org" checked={orgId === o.orgId} onChange={() => setOrgId(o.orgId)} />
                    <span>{o.orgName} · {o.orgType} · 대표 {o.repNameMasked}</span>
                  </label>
                ))}
              </div>
            ))}
            {errs.org && <span className="adm-err">{errs.org}</span>}
          </div>
        ) : (
          <div className="adm-form">
            <Field label="대표자 이름" required error={errs.repName}><input className="adm-input" value={no.repName} onChange={setN("repName")} /></Field>
            <Field label="대표자 연락처" required error={errs.phone}><input className="adm-input" inputMode="tel" placeholder="010-0000-0000" value={no.phone} onChange={setN("phone")} /></Field>
            <Field label="단체명" required error={errs.orgName}><input className="adm-input" value={no.orgName} onChange={setN("orgName")} /></Field>
            <Field label="단체 유형" required><select className="adm-select" value={no.orgType} onChange={setN("orgType")}>{ORG_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="주소" required error={errs.address}><input className="adm-input" value={no.address} onChange={setN("address")} /></Field>
            <Field label="전체 회원 수" required error={errs.memberCount}><input type="number" min={1} className="adm-input" value={no.memberCount} onChange={setN("memberCount")} /></Field>
            <Field label="구민 회원 수" required error={errs.residentCount}><input type="number" min={0} className="adm-input" value={no.residentCount} onChange={setN("residentCount")} /></Field>
          </div>
        )}
        <h2>슬롯</h2>
        <SlotPicker slots={slots} onChange={setSlots} />
        {errs.slots && <span className="adm-err">{errs.slots}</span>}
        <h2 style={{ marginTop: 20 }}>감면</h2>
        <div style={{ maxWidth: 320, marginBottom: 8 }}>
          <Field label="감면 유형"><select className="adm-select" value={discount} onChange={(e) => setDiscount(e.target.value)}>{DISCOUNTS.map((d) => <option key={d} value={d}>{d || "없음"}</option>)}</select></Field>
        </div>
        {discount && <Alert kind="info">감면은 증빙 승인 후 적용됩니다. 서류는 감면 증빙 검토 화면에서 확인합니다.</Alert>}
        <div style={{ display: "grid", gap: 10, margin: "16px 0" }}>
          <label className="adm-check"><input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} />개인정보 수집·이용에 대한 동의를 받았습니다.</label>
          {errs.privacy && <span className="adm-err">{errs.privacy}</span>}
          <label className="adm-check"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />신청자에게 입력한 내용을 읽어 드리고 확인받았음</label>
          {errs.confirmed && <span className="adm-err">{errs.confirmed}</span>}
        </div>
        <div className="adm-row end">
          <button type="button" className="adm-btn" onClick={onClose}>취소</button>
          <button type="submit" className="adm-btn primary" disabled={busy}>{busy ? "저장 중..." : "저장"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function ApplicationsPage() {
  const periods = useLoad<Period[]>("/admin/intake");
  const [periodId, setPeriodId] = useState("");
  const [status, setStatus] = useState("");
  const [via, setVia] = useState("");
  const [discountType, setDiscountType] = useState("");
  const [q, setQ] = useState("");
  const { data, error, loading, reload } = useLoad<App[]>(`/admin/applications?${q}`);
  const [detail, setDetail] = useState<number | null>(null);
  const [form, setForm] = useState(false);
  const [msg, setMsg] = useState("");

  function search(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (periodId) p.set("periodId", periodId);
    if (status) p.set("status", status);
    if (via) p.set("via", via);
    if (discountType) p.set("discountType", discountType);
    setQ(p.toString());
  }

  return (
    <>
      <PageHead title="신청 관리" desc="신청 목록을 확인하고 방문 신청을 대신 입력합니다." actions={<button className="adm-btn primary" onClick={() => setForm(true)}>방문 신청 입력</button>} />
      {msg && <Alert kind="ok">{msg}</Alert>}
      <form className="adm-filters" onSubmit={search}>
        <Field label="접수 기간"><select className="adm-select" value={periodId} onChange={(e) => setPeriodId(e.target.value)}><option value="">전체</option>{(periods.data || []).map((p) => <option key={p.periodId} value={p.periodId}>{p.targetMonth} 이용분</option>)}</select></Field>
        <Field label="상태"><select className="adm-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">전체</option>{["접수", "추첨완료", "취소"].map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="경로"><select className="adm-select" value={via} onChange={(e) => setVia(e.target.value)}><option value="">전체</option><option value="online">온라인</option><option value="visit">방문</option></select></Field>
        <Field label="감면 유형"><select className="adm-select" value={discountType} onChange={(e) => setDiscountType(e.target.value)}><option value="">전체</option>{DISCOUNTS.filter(Boolean).map((d) => <option key={d}>{d}</option>)}</select></Field>
        <button className="adm-btn primary" type="submit">조회</button>
      </form>
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data || data.length === 0 ? <Empty text="조건에 맞는 신청이 없습니다." /> : (
        <Table>
          <thead><tr><th>접수번호</th><th>단체명</th><th>대표자</th><th>연락처</th><th>접수일시</th><th className="num">슬롯</th><th>경로</th><th>감면</th><th>상태</th><th>상세</th></tr></thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.applicationId}>
                <td>{a.applicationNo}</td><td>{a.orgName}</td><td>{a.repNameMasked}</td><td>{a.phoneMasked}</td>
                <td>{fmtDateTime(a.appliedAt)}</td><td className="num">{a.slotCount}개</td><td>{a.via === "visit" ? "방문" : "온라인"}</td><td>{a.discountType || "-"}</td>
                <td><Badge>{a.status}</Badge></td>
                <td><button className="adm-btn small" onClick={() => setDetail(a.applicationId)}>상세</button></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {detail !== null && <DetailView id={detail} onClose={() => setDetail(null)} />}
      {form && <VisitForm onClose={() => setForm(false)} onDone={(m) => { setForm(false); setMsg(m); reload(); }} />}
    </>
  );
}
