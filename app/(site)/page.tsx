"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, errMsg } from "@/lib/api";
import { daysUntil, fmtMD, fmtShort, monthLabel, type Intake } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { Badge, ErrorBox, Loading } from "@/components/ui";

const ICONS = {
  edit: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z",
  list: "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM9 8h6M9 12h6M9 16h4",
  trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0ZM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3",
  chat: "M21 12a8 8 0 0 1-11.7 7L4 20l1.2-4.3A8 8 0 1 1 21 12ZM9.5 10a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.4M12 16.5v.01",
  check: "m5 12 5 5 9-10",
  door: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM8 2v4M16 2v4M3 10h18M9 15l2 2 4-4",
  lock: "M6 11h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2ZM8 11V7a4 4 0 0 1 8 0v4",
  dice: "M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3ZM8 8h.01M16 8h.01M8 16h.01M16 16h.01M12 12h.01",
  bell: "M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0",
};

function Ico({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

type Facility = { facilityId: number; name: string };

export default function HomePage() {
  const router = useRouter();
  const auth = useAuth();
  const [intake, setIntake] = useState<Intake | null>(null);
  const [facs, setFacs] = useState<Facility[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [fac, setFac] = useState("");
  const [date, setDate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const [i, f] = await Promise.all([apiFetch<Intake>("/intake/current"), apiFetch<Facility[]>("/facilities")]);
      setIntake(i);
      setFacs(f);
      if (f[0]) setFac(String(f[0].facilityId));
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const open = intake?.status === "접수중";
  const tone = intake?.status === "접수중" ? "green" : intake?.status === "예정" ? "blue" : "gray";
  const band = !intake
    ? ""
    : intake.status === "접수중"
      ? `${fmtMD(intake.closeAt)}에 마감합니다`
      : intake.status === "예정"
        ? `${fmtMD(intake.openAt)}에 접수가 열립니다`
        : intake.status === "마감"
          ? "접수가 마감되었습니다. 결과는 발표일에 확인합니다"
          : "추첨이 완료되었습니다";

  const steps = intake
    ? [
        { label: "접수 시작", at: intake.openAt, icon: ICONS.door },
        { label: "접수 마감", at: intake.closeAt, icon: ICONS.lock },
        { label: "추첨", at: intake.drawAt, icon: ICONS.dice },
        { label: "결과 발표", at: intake.announceAt, icon: ICONS.bell },
      ]
    : [];
  const nowIdx = !intake ? -1 : intake.status === "예정" ? 0 : intake.status === "접수중" ? 1 : intake.status === "마감" ? 2 : 4;
  const nowTag = intake?.status === "접수중" ? "진행 중" : intake?.status === "예정" ? "곧 시작" : "진행 예정";
  const dn = !intake ? NaN : intake.status === "접수중" ? daysUntil(intake.closeAt) : intake.status === "예정" ? daysUntil(intake.openAt) : NaN;
  const dday = isNaN(dn)
    ? ""
    : `${dn <= 0 ? "D-day" : `D-${dn}`} ${intake?.status === "예정" ? "시작" : "마감"}`;

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams();
    if (fac) q.set("facility", fac);
    if (date) q.set("date", date);
    router.push("/facilities?" + q.toString());
  };

  return (
    <div className="wrap">
      <section className="status-band" aria-label="접수 상태">
        {loading ? (
          <span>접수 상태를 확인하고 있습니다.</span>
        ) : intake ? (
          <>
            <Badge tone={tone}>{intake.status === "접수중" ? "접수 중" : intake.status}</Badge>
            <strong>{monthLabel(intake.targetMonth)} 이용분</strong>
            <span>{band}</span>
          </>
        ) : (
          <span>접수 일정을 불러오지 못했습니다.</span>
        )}
      </section>
      {err && <ErrorBox message={err} onRetry={load} />}

      <section className="hero">
        <h1>이용할 시설과 날짜를 선택합니다</h1>
        <form className="searchbar" onSubmit={search}>
          <div className="field">
            <label htmlFor="h-fac">시설 선택</label>
            <select id="h-fac" value={fac} onChange={(e) => setFac(e.target.value)}>
              {facs.length === 0 && <option value="">시설 정보 없음</option>}
              {facs.map((f) => (
                <option key={f.facilityId} value={f.facilityId}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="h-date">이용일</label>
            <input id="h-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary">
            시간 조회
          </button>
        </form>
      </section>

      <section className="card" style={{ marginTop: 28 }} aria-labelledby="sched-h">
        <div className="sched-h">
          <h2 id="sched-h">접수 일정</h2>
          {dday && <span className="dday">{dday}</span>}
        </div>
        {loading ? (
          <Loading />
        ) : intake ? (
          <ol className="sched-steps">
            {steps.map((s, i) => {
              const cls = i < nowIdx ? "done" : i === nowIdx ? "now" : "";
              return (
                <li key={s.label} className={`sstep ${cls}`} aria-current={i === nowIdx ? "step" : undefined}>
                  <div className="dot">{i < nowIdx ? <Ico d={ICONS.check} /> : <Ico d={s.icon} />}</div>
                  <div className="txt">
                    <b>{s.label}</b>
                  </div>
                  <span>{fmtShort(s.at)}</span>
                  {i === nowIdx && <em>{nowTag}</em>}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="muted">일정을 표시할 수 없습니다.</p>
        )}
      </section>

      <nav className="quick" aria-label="빠른 메뉴">
        <Link href="/facilities" className="on">
          <span className="q-ico" aria-hidden="true"><Ico d={ICONS.edit} /></span>
          <span>
            <strong>신청하기</strong>
            <small>{open ? "시설과 시간을 골라 신청합니다" : "시간 현황을 조회합니다"}</small>
          </span>
        </Link>
        <Link href={auth.token ? "/my" : "/login"}>
          <span className="q-ico" aria-hidden="true"><Ico d={ICONS.list} /></span>
          <span>
            <strong>내 신청</strong>
            <small>신청 내역과 요금을 확인합니다</small>
          </span>
        </Link>
        <Link href={auth.token ? "/my" : "/login"}>
          <span className="q-ico" aria-hidden="true"><Ico d={ICONS.trophy} /></span>
          <span>
            <strong>결과</strong>
            <small>슬롯별 당첨 결과를 확인합니다</small>
          </span>
        </Link>
        <Link href="/qa">
          <span className="q-ico" aria-hidden="true"><Ico d={ICONS.chat} /></span>
          <span>
            <strong>규정 질문</strong>
            <small>요금·감면·환불 규정을 찾습니다</small>
          </span>
        </Link>
      </nav>

      <section style={{ marginTop: 28 }} aria-labelledby="rule-h">
        <h2 id="rule-h" style={{ marginBottom: 12 }}>자주 찾는 규정</h2>
        <div className="acc">
          <details>
            <summary>구민 요금은 누가 받나요?</summary>
            <div className="acc-body">
              회원 중 푸른구민이 절반 이상(50% 이상)인 단체가 구민 요금을 적용받습니다. 예를 들어 회원 10명 중 구민 5명이면 구민 단체이고, 11명 중 5명이면 비구민 단체입니다.
              <br />
              <span className="cite">근거: 가상 조례 대관료 별표 1</span>
            </div>
          </details>
          <details>
            <summary>감면은 어떻게 받나요?</summary>
            <div className="acc-body">
              장애인·국가유공자·구 소재 학교·노인 단체는 증빙 서류를 올리고 담당자가 승인하면 감면됩니다. 여러 감면에 해당하면 가장 높은 하나만 적용합니다.
              <br />
              <span className="cite">근거: 가상 조례 감면 조항</span>
            </div>
          </details>
          <details>
            <summary>취소하면 환불은 얼마인가요?</summary>
            <div className="acc-body">
              이용일 7일 전까지 100%, 3일 전까지 50%, 그 이후는 0%를 환불합니다. 센터 사정으로 취소되면 100%를 환불합니다.
              <br />
              <span className="cite">근거: 가상 운영 규정 환불 조항</span>
            </div>
          </details>
        </div>
      </section>

      <aside className="infobox">
        추첨 결과는 <Link href="/my">내 신청·결과</Link>에서 확인합니다. 같은 시간에 여러 단체가 신청하면 무작위 추첨으로 정합니다.
      </aside>
    </div>
  );
}
