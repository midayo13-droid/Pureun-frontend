"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { clearLogin } from "@/lib/api";
import { Icon } from "./ui";

const MENU = [
  { href: "/", label: "홈" },
  { href: "/facilities", label: "시설·시간 현황" },
  { href: "/my", label: "내 신청·결과" },
  { href: "/qa", label: "규정 안내" },
];
const TABS = [
  { href: "/", label: "홈", icon: "home" as const },
  { href: "/facilities", label: "시설·시간", icon: "cal" as const },
  { href: "/my", label: "내 신청", icon: "doc" as const },
  { href: "/qa", label: "규정 안내", icon: "book" as const },
];

function active(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

export default function SiteShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const auth = useAuth();
  const loggedIn = auth.ready && !!auth.token;
  const logout = () => {
    clearLogin();
    window.location.href = "/";
  };
  const authBtn = loggedIn ? (
    <div className="auth-box">
      <span className="who">{auth.name ? `${auth.name}님` : ""}</span>
      <button type="button" className="btn btn-sm btn-secondary" onClick={logout}>
        로그아웃
      </button>
    </div>
  ) : (
    <div className="auth-box">
      <Link href="/signup" className="btn btn-sm btn-secondary hide-m">
        회원가입
      </Link>
      <Link href="/login" className="btn btn-sm btn-primary">
        로그인
      </Link>
    </div>
  );
  return (
    <div className="site">
      <a href="#main" className="skip">
        본문 바로가기
      </a>
      <header className="topbar">
        <div className="wrap topbar-in">
          <Link href="/" className="logo" aria-label="푸른구 국민체육센터 대관 홈">
            <span className="logo-mark" aria-hidden="true">푸</span>
            <span>푸른구 국민체육센터 <small>시설 대관</small></span>
          </Link>
          <nav className="pc-nav" aria-label="주 메뉴">
            {MENU.map((m) => (
              <Link key={m.href} href={m.href} className={active(path, m.href) ? "on" : ""} aria-current={active(path, m.href) ? "page" : undefined}>
                {m.label}
              </Link>
            ))}
          </nav>
          {authBtn}
        </div>
      </header>
      <main id="main" className="main">
        {children}
      </main>
      <footer className="footer">
        <div className="wrap">
          <strong>푸른구 국민체육센터</strong>
          <p>가상 실습 프로젝트입니다. 실제 기관과 관련이 없습니다.</p>
          <p>문의 센터 담당자 (비밀번호 재설정도 담당자에게 문의합니다)</p>
        </div>
      </footer>
      <nav className="tabbar" aria-label="하단 메뉴">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className={active(path, t.href) ? "on" : ""} aria-current={active(path, t.href) ? "page" : undefined}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
