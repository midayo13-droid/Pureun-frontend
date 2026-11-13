"use client";
import { useState } from "react";
import { useLoad } from "../_lib/useLoad";
import { fmtSlotTime } from "../_lib/api";
import { Empty, ErrorBox, Field, Loading, PageHead, Table } from "../_components/ui";

type Fac = { facilityId: number; name: string };
type Row = { date: string; startHour: number; endHour: number; facilityName: string; orgName: string; repNameMasked: string; requestedPeople: number };

export default function UsageHistoryPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [orgName, setOrgName] = useState("");
  const [q, setQ] = useState("");
  const facs = useLoad<Fac[]>("/facilities");
  const { data, error, loading, reload } = useLoad<Row[]>(`/admin/usage-history?${q}`);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (facilityId) p.set("facilityId", facilityId);
    if (orgName.trim()) p.set("orgName", orgName.trim());
    setQ(p.toString());
  }

  return (
    <>
      <PageHead title="이용 이력" desc="시설을 누가 언제 이용했는지 확인합니다." />
      <form className="adm-filters" onSubmit={search}>
        <Field label="시작일"><input type="date" className="adm-input" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="종료일"><input type="date" className="adm-input" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <Field label="시설">
          <select className="adm-select" value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
            <option value="">전체</option>
            {(facs.data || []).map((f) => <option key={f.facilityId} value={f.facilityId}>{f.name}</option>)}
          </select>
        </Field>
        <Field label="단체명"><input className="adm-input" value={orgName} onChange={(e) => setOrgName(e.target.value)} /></Field>
        <button className="adm-btn primary" type="submit">조회</button>
      </form>
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data || data.length === 0 ? <Empty text="조건에 맞는 이용 이력이 없습니다." /> : (
        <Table>
          <thead><tr><th>이용일시</th><th>시설</th><th>단체명</th><th>대표자</th><th className="num">신청 인원</th></tr></thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i}>
                <td>{fmtSlotTime(r.date, r.startHour, r.endHour)}</td>
                <td>{r.facilityName}</td>
                <td>{r.orgName}</td>
                <td>{r.repNameMasked}</td>
                <td className="num">{r.requestedPeople != null ? `${r.requestedPeople}명` : "-"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
