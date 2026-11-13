import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "푸른구 국민체육센터 시설 대관",
  description: "푸른구 국민체육센터 시설 대관 신청 (가상 실습 프로젝트)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
