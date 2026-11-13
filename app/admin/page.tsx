"use client";
import Link from "next/link";
import { useLoad } from "./_lib/useLoad";
import { fmtDate, fmtDateTime } from "./_lib/api";
import { Badge, ErrorBox, Loading, PageHead } from "./_components/ui";

type Dash = {
  period?: { periodId?: number; targetMonth?: string; status?: string; openAt?: string; closeAt?: string; drawAt?: string; announceAt?: string } | null;
  applicationsCount: number;
  slotsCount: number;
  onlineCount: number;
  visitCount: number;
  evidencePending: number;
  upcomingBlackouts?: { blackoutId?: number; facilityName?: string; startDate: string; endDate: string; reasonType: string; reason?: string }[];
};

export default function AdminDashboard() {
  const { data, error, loading, reload } = useLoad<Dash>("/admin/dashboard");
  if (loading && !data) return (<><PageHead title="대시보드" /><Loading /></>);
  if (error) return (<><PageHead title="대시보드" /><ErrorBox message={error} onRetry={reload} /></>);
  if (!data) return null;
  const p = data.period;
  const total = data.onlineCount + data.visitCount;
  const nextSchedule = !p ? "-" : p.status === "접수중" || p.status === "예정"
    ? `마감 ${fmtDateTime(p.closeAt)}` : p.status === "마감" ? `추첨 ${fmtDateTime(p.drawAt)}` : `발표 ${fmtDateTime(p.announceAt)}`;
  return (
    <>
      <PageHead title="대시보드" desc="지금 처리할 일을 한눈에 확인합니다." />
      <div className="adm-grid4">
        <Link href="/admin/applications" className="adm-stat">
          <div className="t">접수 현황{p?.targetMonth ? ` (${p.targetMonth} 이용분)` : ""}</div>
          <div className="v">{data.applicationsCount.toLocaleString("ko-KR")}건</div>
          <div className="s">슬롯 {data.slotsCount.toLocaleString("ko-KR")}개 · 온라인 {data.onlineCount} / 방문 {data.visitCount}
            {total > 0 ? ` (온라인 ${Math.round((data.onlineCount / total) * 100)}%)` : ""}</div>
        </Link>
        <Link href="/admin/evidence" className="adm-stat">
          <div className="t">감면 확인 대기</div>
          <div className="v">{data.evidencePending.toLocaleString("ko-KR")}건</div>
          <div className="s">승인 대기 증빙</div>
        </Link>
        <Link href="/admin/draw" className="adm-stat">
          <div className="t">추첨 상태</div>
          <div className="v" style={{ fontSize: 24 }}>{p?.status ? <Badge>{p.status}</Badge> : "접수 기간 없음"}</div>
          <div className="s">{nextSchedule}</div>
        </Link>
        <Link href="/admin/blackouts" className="adm-stat">
          <div className="t">다가오는 이용 불가일</div>
          {data.upcomingBlackouts && data.upcomingBlackouts.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 15 }}>
              {data.upcomingBlackouts.slice(0, 3).map((b, i) => (
                <li key={b.blackoutId ?? i}>{fmtDate(b.startDate)}{b.endDate !== b.startDate ? `~${fmtDate(b.endDate)}` : ""} {b.facilityName ?? ""} {b.reasonType}</li>
              ))}
            </ul>
          ) : <div className="s">예정된 이용 불가일이 없습니다.</div>}
        </Link>
      </div>
    </>
  );
}
