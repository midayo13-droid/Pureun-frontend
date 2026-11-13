"use client";
import { useEffect, useState } from "react";
import { useLoad } from "../_lib/useLoad";
import { adminFetch, ApiError, errMsg, fmtDateTime, fromLocalInput, toLocalInput } from "../_lib/api";
import { Alert, Badge, Confirm, ErrorBox, Field, Loading, PageHead } from "../_components/ui";

type Period = { periodId: number; targetMonth: string; openAt: string; closeAt: string; drawAt: string; announceAt: string; status: string };
type Summary = { periodId: number; targetMonth: string; status: string; closeAt: string; totalApplications: number; totalSlots: number; competitiveSlots: number; singleSlots: number; alreadyDrawn: boolean; canRun: boolean; drawId: number | null; published: boolean };
type DrawResult = { drawId: number; totalApplications: number; totalSlots: number; singleCount: number; lotteryCount: number; emptyCount: number };

const EMPTY = { targetMonth: "", openAt: "", closeAt: "", drawAt: "", announceAt: "" };

export default function DrawPage() {
  const periods = useLoad<Period[]>("/admin/intake");
  const [sel, setSel] = useState<number | "new" | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ k: "ok" | "error" | "warn"; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"run" | "publish" | null>(null);
  const [result, setResult] = useState<DrawResult | null>(null);

  const list = periods.data || [];
  useEffect(() => {
    if (sel === null && periods.data) {
      if (periods.data.length === 0) setSel("new");
      else {
        const cur = [...periods.data].sort((a, b) => b.targetMonth.localeCompare(a.targetMonth))[0];
        setSel(cur.periodId);
      }
    }
  }, [periods.data, sel]);

  const current = typeof sel === "number" ? list.find((p) => p.periodId === sel) : undefined;
  useEffect(() => {
    if (current) setForm({ targetMonth: current.targetMonth, openAt: toLocalInput(current.openAt), closeAt: toLocalInput(current.closeAt), drawAt: toLocalInput(current.drawAt), announceAt: toLocalInput(current.announceAt) });
    else if (sel === "new") setForm(EMPTY);
    setResult(null);
    setErrs({});
  }, [current, sel]);

  const summary = useLoad<Summary>(typeof sel === "number" ? `/admin/draw/summary?periodId=${sel}` : null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const fe: Record<string, string> = {};
    if (!/^\d{4}-\d{2}$/.test(form.targetMonth)) fe.targetMonth = "이용 월을 선택해 주세요.";
    (["openAt", "closeAt", "drawAt", "announceAt"] as const).forEach((k) => { if (!form[k]) fe[k] = "일시를 입력해 주세요."; });
    setErrs(fe);
    if (Object.keys(fe).length) return;
    setBusy(true);
    setMsg(null);
    const body = JSON.stringify({ targetMonth: form.targetMonth, openAt: fromLocalInput(form.openAt), closeAt: fromLocalInput(form.closeAt), drawAt: fromLocalInput(form.drawAt), announceAt: fromLocalInput(form.announceAt) });
    try {
      if (typeof sel === "number") {
        await adminFetch(`/admin/intake/${sel}`, { method: "PUT", body });
        setMsg({ k: "ok", t: "접수 일정을 저장했습니다." });
      } else {
        const r = await adminFetch<Period>("/admin/intake", { method: "POST", body });
        setMsg({ k: "ok", t: "접수 기간을 만들었습니다." });
        if (r?.periodId) setSel(r.periodId);
      }
      periods.reload();
      summary.reload();
    } catch (er) {
      if (er instanceof ApiError && er.fields) setErrs(er.fields);
      setMsg({ k: "error", t: errMsg(er) });
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    if (typeof sel !== "number") return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await adminFetch<DrawResult>("/admin/draw", { method: "POST", body: JSON.stringify({ periodId: sel }) });
      setResult(r);
      setMsg({ k: "ok", t: "추첨을 실행했습니다. 결과는 발표 전까지 신청자에게 공개되지 않습니다." });
      summary.reload();
      periods.reload();
    } catch (er) {
      setMsg({ k: "error", t: errMsg(er) });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function publish() {
    const id = summary.data?.drawId ?? result?.drawId;
    if (!id) return;
    setBusy(true);
    setMsg(null);
    try {
      await adminFetch(`/admin/draw/${id}/publish`, { method: "POST" });
      setMsg({ k: "ok", t: "결과를 발표했습니다. 신청자 화면에 결과가 공개됩니다." });
      summary.reload();
    } catch (er) {
      setMsg({ k: "error", t: errMsg(er) });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const s = summary.data;
  const drawId = s?.drawId ?? result?.drawId ?? null;
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHead title="추첨 관리" desc="접수 일정을 설정하고 마감 후 추첨을 실행해 결과를 발표합니다." />
      {msg && <Alert kind={msg.k}>{msg.t}</Alert>}
      {periods.loading && !periods.data ? <Loading /> : periods.error ? <ErrorBox message={periods.error} onRetry={periods.reload} /> : (
        <>
          <section className="adm-card">
            <h2>접수 일정</h2>
            <div className="adm-filters" style={{ maxWidth: 360 }}>
              <Field label="접수 기간">
                <select className="adm-select" value={sel === null ? "" : String(sel)} onChange={(e) => setSel(e.target.value === "new" ? "new" : Number(e.target.value))}>
                  {list.map((p) => <option key={p.periodId} value={p.periodId}>{p.targetMonth} 이용분 ({p.status})</option>)}
                  <option value="new">새 접수 기간 만들기</option>
                </select>
              </Field>
            </div>
            {current && <p style={{ margin: "0 0 12px" }}>현재 상태 <Badge>{current.status}</Badge> · 접수가 시작된 뒤에는 마감 시각만 연장할 수 있습니다.</p>}
            <form onSubmit={save} noValidate>
              <div className="adm-form">
                <Field label="이용 월" required error={errs.targetMonth}><input type="month" className="adm-input" value={form.targetMonth} onChange={set("targetMonth")} /></Field>
                <Field label="접수 시작" required error={errs.openAt}><input type="datetime-local" className="adm-input" value={form.openAt} onChange={set("openAt")} /></Field>
                <Field label="접수 마감" required error={errs.closeAt}><input type="datetime-local" className="adm-input" value={form.closeAt} onChange={set("closeAt")} /></Field>
                <Field label="추첨 시각" required error={errs.drawAt}><input type="datetime-local" className="adm-input" value={form.drawAt} onChange={set("drawAt")} /></Field>
                <Field label="발표 시각" required error={errs.announceAt}><input type="datetime-local" className="adm-input" value={form.announceAt} onChange={set("announceAt")} /></Field>
              </div>
              <button className="adm-btn primary" type="submit" disabled={busy}>{typeof sel === "number" ? "일정 저장" : "접수 기간 만들기"}</button>
            </form>
          </section>

          {typeof sel === "number" && (
            <>
              <section className="adm-card">
                <h2>접수 현황</h2>
                {summary.loading && !s ? <Loading /> : summary.error ? <ErrorBox message={summary.error} onRetry={summary.reload} /> : s && (
                  <dl className="adm-kv">
                    <dt>상태</dt><dd><Badge>{s.status}</Badge></dd>
                    <dt>접수 마감</dt><dd>{fmtDateTime(s.closeAt)}</dd>
                    <dt>신청 수</dt><dd>{s.totalApplications}건</dd>
                    <dt>신청된 슬롯</dt><dd>{s.totalSlots}개</dd>
                    <dt>경쟁 슬롯(2건 이상)</dt><dd>{s.competitiveSlots}개</dd>
                    <dt>단독 슬롯</dt><dd>{s.singleSlots}개</dd>
                    <dt>추첨 상태</dt><dd>{s.alreadyDrawn ? (s.published ? "추첨 완료 · 결과 발표됨" : "추첨 완료 · 발표 전") : "추첨 전"}</dd>
                  </dl>
                )}
              </section>
              <section className="adm-card">
                <h2>추첨 실행</h2>
                {s && !s.canRun && !s.alreadyDrawn && <Alert kind="warn">접수 마감 후에 추첨을 실행할 수 있습니다.</Alert>}
                <div className="adm-row">
                  <button className="adm-btn primary" disabled={busy || !s || s.alreadyDrawn} onClick={() => setConfirm("run")}>추첨 실행</button>
                  <button className="adm-btn" disabled={busy || !drawId || s?.published} onClick={() => setConfirm("publish")}>{s?.published ? "발표 완료" : "결과 발표"}</button>
                </div>
                {result && (
                  <>
                    <h2 style={{ marginTop: 20 }}>추첨 결과</h2>
                    <dl className="adm-kv">
                      <dt>대상 신청 수</dt><dd>{result.totalApplications}건</dd>
                      <dt>슬롯 수</dt><dd>{result.totalSlots}개</dd>
                      <dt>단독 선정</dt><dd>{result.singleCount}개</dd>
                      <dt>추첨 선정</dt><dd>{result.lotteryCount}개</dd>
                      <dt>신청 없음</dt><dd>{result.emptyCount}개</dd>
                    </dl>
                  </>
                )}
              </section>
            </>
          )}
        </>
      )}
      {confirm === "run" && <Confirm title="추첨 실행" message="마감 후 한 번만 실행할 수 있습니다. 실행할까요?" confirmText="실행" busy={busy} onConfirm={run} onCancel={() => setConfirm(null)} />}
      {confirm === "publish" && <Confirm title="결과 발표" message="결과를 신청자 화면에 공개합니다. 발표할까요?" confirmText="발표" busy={busy} onConfirm={publish} onCancel={() => setConfirm(null)} />}
    </>
  );
}
