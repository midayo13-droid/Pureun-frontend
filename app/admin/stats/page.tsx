"use client";
import { useState } from "react";
import { useLoad } from "../_lib/useLoad";
import { pct, won } from "../_lib/api";
import { Empty, ErrorBox, Field, Loading, PageHead, Table } from "../_components/ui";

type Row = { facilityId?: number; facilityName?: string; confirmedCount: number; confirmedHours: number; availableHours: number; utilization: number; revenue: number };
type Stats = { month: string; rows: Row[]; total: Row };

function defaultMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function StatsPage() {
  const [month, setMonth] = useState(defaultMonth());
  const { data, error, loading, reload } = useLoad<Stats>(/^\d{4}-\d{2}$/.test(month) ? `/admin/stats?month=${month}` : null);
  return (
    <>
      <PageHead title="통계" desc="시설별 이용률과 대관료 수입(감면 후 청구액 기준)을 확인합니다." />
      <div className="adm-filters" style={{ maxWidth: 240 }}>
        <Field label="월 선택"><input type="month" className="adm-input" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
      </div>
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data || data.rows.length === 0 ? <Empty text="해당 월의 통계가 없습니다." /> : (
        <Table>
          <thead><tr><th>시설</th><th className="num">확정 건수</th><th className="num">확정 이용 시간</th><th className="num">이용 가능 시간</th><th>이용률</th><th className="num">대관료 수입</th></tr></thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={r.facilityId ?? i}>
                <td>{r.facilityName}</td>
                <td className="num">{r.confirmedCount}건</td>
                <td className="num">{r.confirmedHours}시간</td>
                <td className="num">{r.availableHours}시간</td>
                <td>
                  <div className="adm-row" style={{ flexWrap: "nowrap" }}>
                    <div className="adm-bar" style={{ flex: 1 }} role="img" aria-label={`이용률 ${pct(r.utilization)}`}><span style={{ width: `${Math.min(100, r.utilization * 100)}%` }} /></div>
                    <span style={{ width: 56, textAlign: "right" }}>{pct(r.utilization)}</span>
                  </div>
                </td>
                <td className="num">{won(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
          {data.total && (
            <tfoot>
              <tr>
                <td>합계</td>
                <td className="num">{data.total.confirmedCount}건</td>
                <td className="num">{data.total.confirmedHours}시간</td>
                <td className="num">{data.total.availableHours}시간</td>
                <td>{pct(data.total.utilization)}</td>
                <td className="num">{won(data.total.revenue)}</td>
              </tr>
            </tfoot>
          )}
        </Table>
      )}
    </>
  );
}
