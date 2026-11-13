"use client";
import { useState } from "react";
import { useLoad } from "../_lib/useLoad";
import { adminBlob, adminFetch, errMsg, fmtDateTime } from "../_lib/api";
import { Alert, Badge, Empty, ErrorBox, Field, Loading, Modal, PageHead, Table } from "../_components/ui";

type Ev = { evidenceId: number; applicationId: number; applicationNo: string; orgName: string; discountType: string; status: string; submittedAt: string; fileName: string };

export default function EvidencePage() {
  const { data, error, loading, reload } = useLoad<Ev[]>("/admin/evidence");
  const [msg, setMsg] = useState<{ k: "ok" | "error"; t: string } | null>(null);
  const [rejecting, setRejecting] = useState<Ev | null>(null);
  const [reason, setReason] = useState("");
  const [reasonErr, setReasonErr] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  const list = [...(data || [])].sort((a, b) => (a.status === "대기" ? 0 : 1) - (b.status === "대기" ? 0 : 1) || a.submittedAt.localeCompare(b.submittedAt));

  async function openFile(e: Ev) {
    setMsg(null);
    // 팝업 차단을 피하려고 먼저 창을 연다
    const w = window.open("", "_blank");
    try {
      const blob = await adminBlob(`/admin/evidence/${e.evidenceId}/file`);
      const url = URL.createObjectURL(blob);
      if (w) w.location.href = url; else window.location.href = url;
    } catch (er) {
      w?.close();
      setMsg({ k: "error", t: errMsg(er) });
    }
  }

  async function decide(e: Ev, decision: "승인" | "반려", rejectReason?: string) {
    setBusy(e.evidenceId);
    setMsg(null);
    try {
      await adminFetch(`/admin/evidence/${e.evidenceId}`, { method: "PUT", body: JSON.stringify({ decision, rejectReason }) });
      setMsg({ k: "ok", t: `${e.applicationNo} 증빙을 ${decision}했습니다.` });
      setRejecting(null);
      setReason("");
      reload();
    } catch (er) {
      setMsg({ k: "error", t: errMsg(er) });
    } finally {
      setBusy(null);
    }
  }

  function submitReject() {
    if (!reason.trim()) {
      setReasonErr("반려 사유를 입력해 주세요.");
      return;
    }
    if (rejecting) decide(rejecting, "반려", reason.trim());
  }

  return (
    <>
      <PageHead title="감면 증빙 검토" desc="승인 대기 건을 먼저 보여줍니다. 증빙 확인 기한은 당첨 발표 후 2영업일 이내입니다." />
      {msg && <Alert kind={msg.k}>{msg.t}</Alert>}
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : list.length === 0 ? <Empty text="검토할 증빙이 없습니다." /> : (
        <Table>
          <thead><tr><th>접수번호</th><th>단체</th><th>감면 유형</th><th>제출일시</th><th>상태</th><th>파일</th><th>처리</th></tr></thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.evidenceId}>
                <td>{e.applicationNo}</td>
                <td>{e.orgName}</td>
                <td>{e.discountType}</td>
                <td>{fmtDateTime(e.submittedAt)}</td>
                <td><Badge>{e.status}</Badge></td>
                <td><button className="adm-btn small" onClick={() => openFile(e)}>{e.fileName || "파일 열기"}</button></td>
                <td>
                  {e.status === "대기" ? (
                    <div className="adm-row">
                      <button className="adm-btn small primary" disabled={busy === e.evidenceId} onClick={() => decide(e, "승인")}>승인</button>
                      <button className="adm-btn small danger" disabled={busy === e.evidenceId} onClick={() => { setRejecting(e); setReason(""); setReasonErr(""); }}>반려</button>
                    </div>
                  ) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {rejecting && (
        <Modal title="증빙 반려" onClose={() => setRejecting(null)}>
          <p>{rejecting.applicationNo} · {rejecting.orgName}</p>
          <Field label="반려 사유" required error={reasonErr}>
            <textarea className="adm-textarea" value={reason} onChange={(ev) => setReason(ev.target.value)} />
          </Field>
          <div className="adm-row end">
            <button className="adm-btn" onClick={() => setRejecting(null)}>취소</button>
            <button className="adm-btn primary" disabled={busy !== null} onClick={submitReject}>반려하기</button>
          </div>
        </Modal>
      )}
    </>
  );
}
