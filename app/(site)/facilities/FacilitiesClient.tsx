"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, errMsg, getToken } from "@/lib/api";
import { dow, fmtDate, fmtSlotTime, fmtWon, loadSlots, monthLabel, parseDate, saveSlots, type Intake, type SelectedSlot } from "@/lib/format";
import { Badge, ErrorBox, Loading } from "@/components/ui";

type Rate = { residentType: string; dayType: string; pricePerHour: number };
type Facility = { facilityId: number; name: string; openHour: number; closeHour: number; rates: Rate[] };
type Day = {
  date: string;
  isWeekend: boolean;
  blackout: { reasonType: string; reason: string } | null;
  slots: { hour: number; state: "available" | "blocked" | "confirmed" }[];
};
type Cal = { facilityId: number; month: string; days: Day[] };

const keyOf = (s: { facilityId: number; date: string; startHour: number }) => `${s.facilityId}|${s.date}|${s.startHour}`;

function shiftMonth(m: string, d: number) {
  const [y, mm] = m.split("-").map(Number);
  const dt = new Date(y, mm - 1 + d, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

export default function FacilitiesClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const qFac = sp.get("facility");
  const qDate = sp.get("date");

  const [facs, setFacs] = useState<Facility[]>([]);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [facId, setFacId] = useState<number | null>(null);
  const [month, setMonth] = useState<string>("");
  const [cal, setCal] = useState<Cal | null>(null);
  const [date, setDate] = useState<string>("");
  const [basket, setBasket] = useState<SelectedSlot[]>([]);
  const [isRes, setIsRes] = useState<boolean | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [calErr, setCalErr] = useState("");
  const [calLoading, setCalLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const init = useCallback(async () => {
    setLoading(true);
    setLoadErr("");
    try {
      const [f, i] = await Promise.all([apiFetch<Facility[]>("/facilities"), apiFetch<Intake>("/intake/current")]);
      setFacs(f);
      setIntake(i);
      const fid = f.find((x) => String(x.facilityId) === qFac)?.facilityId ?? f[0]?.facilityId ?? null;
      setFacId(fid);
      setMonth(qDate ? qDate.slice(0, 7) : i.targetMonth);
      if (qDate) setDate(qDate);
      setBasket(loadSlots());
    } catch (e) {
      setLoadErr(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [qFac, qDate]);
  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!getToken()) return;
    apiFetch<{ org: { isResidentOrg: boolean } | null }>("/auth/me")
      .then((m) => setIsRes(m.org ? m.org.isResidentOrg : null))
      .catch(() => {});
  }, []);

  const loadCal = useCallback(async () => {
    if (facId == null || !month) return;
    setCalLoading(true);
    setCalErr("");
    try {
      setCal(await apiFetch<Cal>(`/calendar?facilityId=${facId}&month=${month}`));
    } catch (e) {
      setCal(null);
      setCalErr(errMsg(e));
    } finally {
      setCalLoading(false);
    }
  }, [facId, month]);
  useEffect(() => {
    loadCal();
  }, [loadCal]);

  const fac = facs.find((f) => f.facilityId === facId) || null;
  const selectable = !!intake && intake.status === "접수중" && month === intake.targetMonth;
  const picked = useMemo(() => new Set(basket.map(keyOf)), [basket]);

  const update = (b: SelectedSlot[]) => {
    setBasket(b);
    saveSlots(b);
  };

  const clickSlot = (day: Day, hour: number, state: string) => {
    if (!fac) return;
    if (state === "blocked") {
      setNotice(`이용할 수 없는 날입니다${day.blackout ? `(${day.blackout.reasonType}${day.blackout.reason ? ": " + day.blackout.reason : ""})` : ""}.`);
      return;
    }
    if (state === "confirmed") {
      setNotice("이미 확정된 시간입니다.");
      return;
    }
    if (!selectable) {
      setNotice("지금은 조회만 가능합니다. 접수 중인 이용 월의 시간만 선택할 수 있습니다.");
      return;
    }
    if (!getToken()) {
      setNotice("login");
      return;
    }
    setNotice("");
    const s: SelectedSlot = { facilityId: fac.facilityId, facilityName: fac.name, date: day.date, startHour: hour };
    const k = keyOf(s);
    update(picked.has(k) ? basket.filter((b) => keyOf(b) !== k) : [...basket, s]);
  };

  const price = (day: Day) => {
    if (!fac || isRes == null) return null;
    const r = fac.rates.find((x) => x.residentType === (isRes ? "구민" : "비구민") && x.dayType === (day.isWeekend ? "주말·공휴일" : "평일"));
    return r ? r.pricePerHour : null;
  };

  const goApply = () => {
    if (basket.length === 0) return;
    window.location.href = getToken() ? "/apply" : "/login";
  };
  void router;

  const selDay = cal?.days.find((d) => d.date === date) || null;
  const countAvail = (d: Day) => d.slots.filter((s) => s.state === "available").length;
  const countPicked = (d: Day) => basket.filter((b) => b.facilityId === facId && b.date === d.date).length;

  const SlotPanel = ({ day }: { day: Day }) => {
    const p = price(day);
    return (
      <div className="card" aria-live="polite">
        <h3>{fmtDate(day.date)}</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          {day.isWeekend ? "주말·공휴일 요금 적용" : "평일 요금 적용"}
          {p != null && ` · 시간당 ${fmtWon(p)}`}
          {day.blackout && ` · 이용 불가(${day.blackout.reasonType})`}
        </p>
        <div className="chips">
          {day.slots.map((s) => {
            const sel = picked.has(`${facId}|${day.date}|${s.hour}`);
            const cls = sel ? "sel" : s.state === "blocked" ? "blocked" : s.state === "confirmed" ? "confirmed" : selectable ? "" : "ro";
            return (
              <button
                key={s.hour}
                type="button"
                className={`chip ${cls}`}
                aria-pressed={sel}
                onClick={() => clickSlot(day, s.hour, s.state)}
              >
                {String(s.hour).padStart(2, "0")}:00
                <small>{sel ? "선택됨" : s.state === "blocked" ? "이용 불가" : s.state === "confirmed" ? "확정됨" : selectable ? "선택 가능" : "비어 있음"}</small>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) return <div className="wrap"><Loading /></div>;
  if (loadErr)
    return (
      <div className="wrap">
        <ErrorBox message={loadErr} onRetry={init} />
      </div>
    );

  const first = month ? parseDate(month + "-01").getDay() : 0;

  return (
    <div className="wrap">
      <div className="page-title">
        <h1>시설·시간 현황</h1>
        <p>{selectable ? "시설과 날짜를 고른 뒤 이용할 시간을 선택합니다." : "시설과 날짜를 고르면 비어 있는 시간을 조회할 수 있습니다."}</p>
      </div>

      <div className="tabs" role="tablist" aria-label="시설">
        {facs.map((f) => (
          <button key={f.facilityId} type="button" role="tab" className="tab" aria-selected={f.facilityId === facId} onClick={() => { setFacId(f.facilityId); setDate(""); setNotice(""); }}>
            {f.name}
          </button>
        ))}
      </div>

      <div className="row between" style={{ marginBottom: 12 }}>
        <div className="row">
          <button type="button" className="btn btn-sm btn-gray" onClick={() => { setMonth(shiftMonth(month, -1)); setDate(""); }} aria-label="이전 달">이전 달</button>
          <strong style={{ fontSize: 20 }}>{monthLabel(month)}</strong>
          <button type="button" className="btn btn-sm btn-gray" onClick={() => { setMonth(shiftMonth(month, 1)); setDate(""); }} aria-label="다음 달">다음 달</button>
        </div>
        {selectable ? <Badge tone="green">접수 중 · 선택 가능</Badge> : <Badge tone="gray">조회만 가능</Badge>}
      </div>
      {!selectable && intake && (
        <div className="alert alert-info" style={{ marginBottom: 12 }}>
          접수 중인 이용 월은 {monthLabel(intake.targetMonth)}입니다. {intake.status !== "접수중" && "현재는 접수 기간이 아니어서 조회만 할 수 있습니다."}
        </div>
      )}
      {notice === "login" ? (
        <div className="alert alert-warn" role="status" style={{ marginBottom: 12 }}>
          <span>시간을 선택하려면 로그인이 필요합니다.</span>
          <a className="btn btn-sm btn-primary" href="/login">로그인하기</a>
        </div>
      ) : (
        notice && (
          <div className="alert alert-warn" role="status" style={{ marginBottom: 12 }}>
            {notice}
          </div>
        )
      )}

      <div className="fac-layout">
        <div>
          {calLoading && <Loading />}
          {calErr && <ErrorBox message={calErr} onRetry={loadCal} />}
          {cal && !calLoading && (
            <>
              <div className="only-d">
                <div className="cal-grid" role="grid" aria-label={`${monthLabel(month)} 달력`}>
                  {["일", "월", "화", "수", "목", "금", "토"].map((w, i) => (
                    <div key={w} className={`cal-h ${i === 0 ? "sun" : i === 6 ? "sat" : ""}`}>{w}</div>
                  ))}
                  {Array.from({ length: first }).map((_, i) => (
                    <div key={"e" + i} className="cal-d empty" />
                  ))}
                  {cal.days.map((d) => {
                    const w = parseDate(d.date).getDay();
                    const a = countAvail(d);
                    return (
                      <button
                        key={d.date}
                        type="button"
                        className={`cal-d ${w === 0 ? "sun" : w === 6 ? "sat" : ""} ${d.date === date ? "sel" : ""} ${d.blackout || a === 0 ? "off" : ""}`}
                        onClick={() => { setDate(d.date); setNotice(""); }}
                        aria-label={`${fmtDate(d.date)} ${d.blackout ? "이용 불가" : `가능 ${a}칸`}`}
                      >
                        <span className="dn">{Number(d.date.slice(8))}</span>
                        <span className="cnt">{d.blackout ? d.blackout.reasonType : `가능 ${a}`}</span>
                        {countPicked(d) > 0 && <span className="picked">선택 {countPicked(d)}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="only-m daylist">
                {cal.days.map((d) => {
                  const a = countAvail(d);
                  return (
                    <div key={d.date}>
                      <button
                        type="button"
                        className={`dayrow ${d.date === date ? "sel" : ""} ${d.blackout || a === 0 ? "off" : ""}`}
                        aria-expanded={d.date === date}
                        onClick={() => { setDate(d.date === date ? "" : d.date); setNotice(""); }}
                      >
                        <span>
                          {Number(d.date.slice(8))}일({dow(d.date)}) {d.isWeekend && <small>주말·공휴일</small>}
                        </span>
                        <span className="muted">
                          {d.blackout ? `이용 불가(${d.blackout.reasonType})` : `가능 ${a}칸`}
                          {countPicked(d) > 0 && ` · 선택 ${countPicked(d)}`}
                        </span>
                      </button>
                      {d.date === date && selDay && <div style={{ marginTop: 8 }}><SlotPanel day={selDay} /></div>}
                    </div>
                  );
                })}
              </div>
              <div className="legend-row">
                <span>{selectable ? "선택 가능" : "비어 있음(조회만 가능)"}</span>{selectable && <span>선택됨(파란색)</span>}<span>이용 불가(점선, 사유 표시)</span><span>확정됨(다른 단체 당첨)</span>
              </div>
            </>
          )}
        </div>

        <aside>
          <div className="only-d" style={{ marginBottom: 16 }}>
            {selDay ? <SlotPanel day={selDay} /> : <div className="card muted">달력에서 날짜를 선택하면 시간이 표시됩니다.</div>}
          </div>
          {(selectable || basket.length > 0) && <div className="card basket">
            <h3>선택 바구니 ({basket.length}개)</h3>
            {basket.length === 0 ? (
              <p className="muted" style={{ marginBottom: 12 }}>선택한 시간이 없습니다.</p>
            ) : (
              <ul>
                {basket.map((b) => (
                  <li key={keyOf(b)}>
                    <span>{b.facilityName} {fmtDate(b.date)} {fmtSlotTime(b.startHour)}</span>
                    <button type="button" className="x" onClick={() => update(basket.filter((x) => keyOf(x) !== keyOf(b)))} aria-label="선택 삭제">삭제</button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="btn btn-primary btn-block" disabled={basket.length === 0} onClick={goApply}>
              신청서 작성
            </button>
            {basket.length > 0 && !getToken() && <p className="muted" style={{ marginTop: 8 }}>신청서 작성은 로그인 후 이용할 수 있습니다.</p>}
          </div>}
        </aside>
      </div>
    </div>
  );
}
