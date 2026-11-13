const DOW = ["일", "월", "화", "수", "목", "금", "토"];

export function parseDate(d: string): Date {
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, day);
}
export function fmtDate(d: string): string {
  return `${d.slice(0, 10)}(${DOW[parseDate(d).getDay()]})`;
}
export function dow(d: string): string {
  return DOW[parseDate(d).getDay()];
}
export function pad(n: number): string {
  return String(n).padStart(2, "0");
}
export function fmtSlotTime(h: number): string {
  return `${pad(h)}:00~${pad(h + 1)}:00`;
}
export function fmtWon(n: number | null | undefined): string {
  return `${(n ?? 0).toLocaleString("ko-KR")}원`;
}
export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}(${DOW[d.getDay()]}) ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fmtMD(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fmtShort(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}/${d.getDate()}(${DOW[d.getDay()]}) ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function daysUntil(iso: string): number {
  const t = new Date(iso);
  if (isNaN(t.getTime())) return NaN;
  const now = new Date();
  const a = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((a - b) / 86400000);
}
export function monthLabel(m: string): string {
  const [y, mm] = m.split("-");
  return `${y}년 ${Number(mm)}월`;
}

export type Slot = { facilityId: number; date: string; startHour: number };
export type SelectedSlot = Slot & { facilityName: string };

export const SLOT_KEY = "rental_selected_slots";
export function loadSlots(): SelectedSlot[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(SLOT_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function saveSlots(s: SelectedSlot[]) {
  try {
    sessionStorage.setItem(SLOT_KEY, JSON.stringify(s));
  } catch {}
}

export type Intake = {
  periodId: number;
  targetMonth: string;
  openAt: string;
  closeAt: string;
  drawAt: string;
  announceAt: string;
  status: "예정" | "접수중" | "마감" | "추첨완료";
  resultPublished: boolean;
};
