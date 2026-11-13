"use client";
import { ReactNode, useEffect, useRef } from "react";

const STATUS_CLASS: Record<string, string> = {
  대기: "wait", 접수: "wait", 예정: "wait", 접수중: "prog", 진행: "prog",
  승인: "ok", 완료: "ok", 당첨: "ok", 추첨완료: "ok",
  반려: "no", 탈락: "no", 취소: "no", 마감: "no",
};

export function Badge({ children }: { children: string }) {
  return <span className={`adm-badge ${STATUS_CLASS[children] || "gray"}`}>{children}</span>;
}

export function PageHead({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="adm-pagehead">
      <div>
        <h1>{title}</h1>
        {desc && <p className="adm-desc">{desc}</p>}
      </div>
      {actions && <div className="adm-actions">{actions}</div>}
    </div>
  );
}

export function Loading({ text = "불러오는 중입니다." }: { text?: string }) {
  return <div className="adm-state" role="status">{text}</div>;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="adm-alert error" role="alert">
      <span>{message}</span>
      {onRetry && <button className="adm-btn small" onClick={onRetry}>다시 시도</button>}
    </div>
  );
}

export function Empty({ text = "표시할 내용이 없습니다." }: { text?: string }) {
  return <div className="adm-state">{text}</div>;
}

export function Alert({ kind = "info", children }: { kind?: "info" | "error" | "warn" | "ok"; children: ReactNode }) {
  return <div className={`adm-alert ${kind}`} role={kind === "error" ? "alert" : "status"}>{children}</div>;
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    ref.current?.focus();
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="adm-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`adm-modal${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="adm-modal-head">
          <h2>{title}</h2>
          <button className="adm-btn small" onClick={onClose} aria-label="닫기">닫기</button>
        </div>
        <div className="adm-modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Confirm({ title, message, confirmText = "확인", onConfirm, onCancel, busy }: {
  title: string; message: string; confirmText?: string; onConfirm: () => void; onCancel: () => void; busy?: boolean;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p>{message}</p>
      <div className="adm-row end">
        <button className="adm-btn" onClick={onCancel}>취소</button>
        <button className="adm-btn primary" onClick={onConfirm} disabled={busy}>{busy ? "처리 중..." : confirmText}</button>
      </div>
    </Modal>
  );
}

export function Field({ label, error, children, required }: { label: string; error?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="adm-field">
      <span className="adm-label">{label}{required && <em> *</em>}</span>
      {children}
      {error && <span className="adm-err">{error}</span>}
    </label>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return <div className="adm-tablewrap"><table className="adm-table">{children}</table></div>;
}
