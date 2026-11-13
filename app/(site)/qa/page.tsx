"use client";
import { useState } from "react";
import { apiFetch, errMsg } from "@/lib/api";
import { Badge, Loading } from "@/components/ui";

type Clause = { clauseId: number; doc: string; articleLabel: string; title: string; body: string; priority: number | boolean };
type QaRes = { answer: string | null; answeredBy: string; clauses: Clause[] };

const EXAMPLES = ["구민 요금은 누가 받나요?", "감면이 두 개 해당되면요?", "3일 전에 취소하면 환불은?"];
const PII = /(01[016789][-\s]?\d{3,4}[-\s]?\d{4})|(\d{6}[-\s]?[1-4]\d{6})/;

export default function QaPage() {
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState("");
  const [res, setRes] = useState<QaRes | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setErr("");
    if (PII.test(question)) {
      setErr("개인정보가 포함된 것 같습니다. 번호 등 개인정보는 지우고 다시 질문해 주세요.");
      return;
    }
    setBusy(true);
    setAsked(question);
    setRes(null);
    try {
      setRes(await apiFetch<QaRes>("/qa", { method: "POST", body: { question } }));
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const clauses = res ? [...res.clauses].sort((a, b) => (a.doc === b.doc ? 0 : a.doc === "조례" ? -1 : 1)) : [];

  return (
    <div className="wrap">
      <div className="page-title">
        <h1>규정 안내</h1>
        <p>대관료·감면·환불 등 규정을 질문하면 근거 조항과 함께 안내합니다.</p>
      </div>
      <div className="alert alert-warn" style={{ marginBottom: 16 }}>
        개인정보는 입력하지 마세요. 이 답변은 안내이며 최종 판단은 센터 담당자가 합니다.
      </div>
      <form className="qa-form" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <label htmlFor="q" style={{ position: "absolute", left: -999 }}>질문 입력</label>
        <input id="q" type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="궁금한 규정을 입력합니다" />
        <button type="submit" className="btn btn-primary" disabled={busy}>질문 보내기</button>
      </form>
      <div className="examples" aria-label="예시 질문">
        {EXAMPLES.map((x) => (
          <button key={x} type="button" className="example" onClick={() => { setQ(x); ask(x); }}>{x}</button>
        ))}
      </div>

      {err && <div className="alert alert-danger" role="alert">{err}</div>}
      {busy && <Loading text="규정을 찾고 있습니다." />}
      {res && (
        <section aria-live="polite">
          <div className="card">
            <p className="muted" style={{ marginBottom: 8 }}>질문: {asked}</p>
            {res.answer ? (
              <>
                <h2 style={{ fontSize: 18 }}>답변</h2>
                <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{res.answer}</p>
              </>
            ) : res.clauses.length === 0 ? (
              <p>규정에서 근거를 찾지 못했습니다. 센터 담당자에게 문의하세요.</p>
            ) : (
              <div className="alert alert-info">챗봇 답변 연결 예정입니다. 지금은 관련 규정 원문만 보여드립니다.</div>
            )}
          </div>
          {clauses.length > 0 && <h2 style={{ fontSize: 18, margin: "20px 0 0" }}>근거 조항</h2>}
          {clauses.map((c) => (
            <details key={c.clauseId} className="clause">
              <summary>
                <Badge tone={c.doc === "조례" ? "blue" : "gray"}>{c.doc}</Badge>
                <strong>{c.articleLabel}</strong>
                <span>{c.title}</span>
                {c.doc === "조례" && <Badge tone="orange">조례 우선</Badge>}
              </summary>
              <div className="body">{c.body}</div>
            </details>
          ))}
          {clauses.length > 0 && <p className="muted" style={{ marginTop: 12 }}>조례와 규정이 다르면 조례를 따릅니다.</p>}
        </section>
      )}
    </div>
  );
}
