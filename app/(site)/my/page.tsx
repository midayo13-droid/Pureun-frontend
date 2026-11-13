"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, errMsg } from "@/lib/api";
import { useRequireLogin } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { Badge, ErrorBox, Loading } from "@/components/ui";

type Row = { applicationId: number; applicationNo: string; appliedAt: string; via: string; status: string; slotCount: number; resultPublished: boolean };

function statusLabel(status: string, published: boolean) {
  if (status === "취소") return { t: "취소", tone: "gray" as const };
  if (published || status === "추첨완료") return published ? { t: "결과 발표", tone: "green" as const } : { t: "추첨 대기", tone: "blue" as const };
  return { t: "접수", tone: "blue" as const };
}

export default function MyPage() {
  const { ok } = useRequireLogin();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    setErr("");
    setRows(null);
    try {
      setRows(await apiFetch<Row[]>("/applications/me"));
    } catch (e) {
      setErr(errMsg(e));
    }
  }, []);
  useEffect(() => {
    if (ok) load();
  }, [ok, load]);

  return (
    <div className="wrap">
      <div className="page-title">
        <h1>내 신청·결과</h1>
        <p>신청 내역과 추첨 결과를 확인합니다. 결과는 발표 전에는 추첨 대기로 표시됩니다.</p>
      </div>
      {!ok || (rows === null && !err) ? <Loading /> : null}
      {err && <ErrorBox message={err} onRetry={load} />}
      {rows && rows.length === 0 && (
        <div className="card">
          <p>신청 내역이 없습니다.</p>
          <p style={{ marginTop: 12 }}><Link href="/facilities" className="btn btn-primary">시설·시간 현황 보기</Link></p>
        </div>
      )}
      {rows && rows.length > 0 && (
        <table className="tbl stack-m card" style={{ padding: 0 }}>
          <thead>
            <tr><th>접수번호</th><th>접수일시</th><th>슬롯 수</th><th>상태</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const s = statusLabel(r.status, r.resultPublished);
              return (
                <tr key={r.applicationId}>
                  <td data-l="접수번호"><strong>{r.applicationNo}</strong></td>
                  <td data-l="접수일시">{fmtDateTime(r.appliedAt)}</td>
                  <td data-l="슬롯">{r.slotCount}개</td>
                  <td><Badge tone={s.tone}>{s.t}</Badge></td>
                  <td><Link href={`/my/${r.applicationId}`} className="btn btn-sm btn-secondary">상세 보기</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
