"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import "./admin.css";
import { logoutToLogin } from "./_lib/api";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/applications", label: "신청 관리" },
  { href: "/admin/evidence", label: "감면 증빙" },
  { href: "/admin/draw", label: "추첨 관리" },
  { href: "/admin/draw-logs", label: "추첨 기록" },
  { href: "/admin/blackouts", label: "이용 불가일" },
  { href: "/admin/stats", label: "통계" },
  { href: "/admin/usage-history", label: "이용 이력" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let token: string | null = null;
    let role: string | null = null;
    let n: string | null = null;
    try {
      token = localStorage.getItem("rental_token");
      role = localStorage.getItem("rental_role");
      n = localStorage.getItem("rental_name");
    } catch {}
    if (!token || role !== "admin") {
      router.replace("/login");
      return;
    }
    setName(n || "관리자");
  }, [router]);

  if (name === null) {
    return <div className="adm-root"><div className="adm-state" role="status">확인하는 중입니다.</div></div>;
  }

  return (
    <div className="adm-root">
      <header className="adm-top">
        <Link href="/admin" className="adm-logo">푸른구 국민체육센터 관리</Link>
        <div className="adm-user">
          <span>{name} 님</span>
          <button className="adm-logout" onClick={logoutToLogin}>로그아웃</button>
        </div>
      </header>
      <div className="adm-body">
        <nav className="adm-nav" aria-label="관리자 메뉴">
          {NAV.map((n) => {
            const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <main className="adm-main">{children}</main>
      </div>
    </div>
  );
}
