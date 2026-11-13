"use client";
import type { ReactNode } from "react";

export function Loading({ text = "불러오는 중입니다." }: { text?: string }) {
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden="true" />
      {text}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="alert alert-danger" role="alert">
      <div>{message}</div>
      {onRetry && (
        <button type="button" className="btn btn-sm btn-secondary" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  );
}

export function Badge({ tone = "gray", children }: { tone?: "gray" | "blue" | "green" | "orange" | "red"; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Field({
  label,
  error,
  help,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  help?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {help && !error && <p className="help">{help}</p>}
      {error && (
        <p className="err" id={htmlFor + "-err"}>
          {error}
        </p>
      )}
    </div>
  );
}

const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
export function Icon({ name, size = 24 }: { name: "home" | "cal" | "doc" | "book" | "check" | "chev" | "search" | "user"; size?: number }) {
  const d: Record<string, ReactNode> = {
    home: <path d="M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6" />,
    cal: <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />,
    doc: <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7" />,
    book: <path d="M4 4h7a3 3 0 013 3v13a2 2 0 00-2-2H4zM20 4h-6M20 4v14h-6" />,
    check: <path d="M5 12l5 5 9-10" />,
    chev: <path d="M6 9l6 6 6-6" />,
    search: <path d="M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4" />,
    user: <path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...P}>
      {d[name]}
    </svg>
  );
}
