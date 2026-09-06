"use client";

import { useState, useCallback, memo } from "react";
import { Check, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────
   토스트 — 화면 오른쪽 위에서 미끄러져 들어오고 스스로 사라진다.

   두 벌이 있었다. components/balance/shared.tsx 의 것(잔고·모의투자·매매창이
   쓰던 것)과 analyze 가 따로 가진 것이다. 생김새는 거의 같은데 들어오는
   방향(오른쪽/위)과 아이콘 유무가 달라서, 같은 서비스 안에서 화면마다 알림이
   다르게 나타났다. 여기로 모은다.

   남긴 쪽은 shared 의 것이다 — 쓰는 곳이 여섯 군데로 더 많았고 아이콘이 있어
   성공·실패가 색뿐 아니라 모양으로도 갈린다(색만으로 가르면 색각 이상에서
   구분이 사라진다). analyze 에만 있던 것 둘은 가져왔다: 토스트별 표시 시간과,
   좁은 화면에서 토스트가 화면 끝에 붙지 않게 하는 좌우 여백.
   ───────────────────────────────────────────────────────────────────────── */

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

const DEFAULT_DURATION = 4500;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, duration = DEFAULT_DURATION) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  return { toasts, addToast, removeToast };
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <Check size={13} />,
  error: <AlertCircle size={13} />,
  info: <AlertCircle size={13} />,
  warning: <AlertCircle size={13} />,
};

const TONES: Record<ToastType, string> = {
  success: "bg-emerald-50/95 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300",
  error: "bg-red-50/95 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300",
  info: "bg-[#f0fdf4]/95 dark:bg-[#052e16]/60 border-[#bbf7d0] dark:border-[#166534] text-[#166534] dark:text-[#86efac]",
  warning: "bg-amber-50/95 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300",
};

export const ToastNotification = memo(({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) => (
  <div className={cn(
    "flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md",
    "animate-in slide-in-from-right-4 fade-in duration-300 pointer-events-auto max-w-sm",
    TONES[toast.type]
  )}>
    <span className="shrink-0">{ICONS[toast.type]}</span>
    <span className="text-xs font-bold flex-1 leading-snug">{toast.message}</span>
    <button
      onClick={() => onRemove(toast.id)}
      aria-label="알림 닫기"
      className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0"
    >
      <X size={11} />
    </button>
  </div>
));
ToastNotification.displayName = "ToastNotification";

export function ToastContainer({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[100] max-w-sm w-full space-y-2 pointer-events-none px-4 sm:px-0">
      {toasts.map(t => (
        <ToastNotification key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}
