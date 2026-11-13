"use client";
import { useState } from "react";
import { useLoad } from "../_lib/useLoad";
import { fmtDateTime, fmtSlotTime } from "../_lib/api";
import { Empty, ErrorBox, Loading, Modal, PageHead, Table } from "../_components/ui";

type Log = { drawId: number; periodId: number; targetMonth: string; runAt: string; totalApplications: number; totalSlots: number; ruleVersion: string };
type Detail = Log & { runBy?: string; runByMasked?: string; slots?: { facilityName: string; date: string; startHour: number; applicantCount: number; method: string; winnerApplicationNo: string | null }[] };

function DetailView({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, error, loading, reload } = useLoad<Detail>(`/admin/draw-logs/${id}`);
  return (
    <Modal title="추첨 기록 상세" onClose={onClose} wide>
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : data && (
        <>
          <dl className="adm-kv">
            <dt>이용 월</dt><dd>{data.targetMonth}</dd>
            <dt>실행 시각</dt><dd>{fmtDateTime(data.runAt)}</dd>
            <dt>실행한 관리자</dt><dd>{data.runByMasked || data.runBy || "-"}</dd>
            <dt>규칙 버전</dt><dd>{data.ruleVersion}</dd>
            <dt>대상 신청 수</dt><dd>{data.totalApplications}건</dd>
            <dt>슬롯 수</dt><dd>{data.totalSlots}개</dd>
          </dl>
          {!data.slots || data.slots.length === 0 ? <Empty /> : (
            <Table>
              <thead><tr><th>시설</th><th>날짜·시간</th><th className="num">신청 건수</th><th>선정 방식</th><th>당첨 접수번호</th></tr></thead>
              <tbody>
                {data.slots.map((s, i) => (
                  <tr key={i}>
                    <td>{s.facilityName}</td>
                    <td>{fmtSlotTime(s.date, s.startHour)}</td>
                    <td className="num">{s.applicantCount}건</td>
                    <td>{s.method}</td>
                    <td>{s.winnerApplicationNo || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}
    </Modal>
  );
}

export default function DrawLogsPage() {
  const { data, error, loading, reload } = useLoad<Log[]>("/admin/draw-logs");
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <PageHead title="추첨 기록" desc="추첨 실행 기록을 확인합니다. 단체명·대표자와 난수 기록은 표시하지 않습니다." />
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data || data.length === 0 ? <Empty text="추첨 기록이 없습니다." /> : (
        <Table>
          <thead><tr><th>이용 월</th><th>실행 시각</th><th className="num">신청 수</th><th className="num">슬롯 수</th><th>규칙 버전</th><th>상세</th></tr></thead>
          <tbody>
            {data.map((l) => (
              <tr key={l.drawId}>
                <td>{l.targetMonth}</td>
                <td>{fmtDateTime(l.runAt)}</td>
                <td className="num">{l.totalApplications}건</td>
                <td className="num">{l.totalSlots}개</td>
                <td>{l.ruleVersion}</td>
                <td><button className="adm-btn small" onClick={() => setOpen(l.drawId)}>상세 보기</button></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {open !== null && <DetailView id={open} onClose={() => setOpen(null)} />}
    </>
  );
}
