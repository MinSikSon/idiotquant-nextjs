"use client";

import { useState, useEffect, useCallback } from "react";
import { KeyRound, Save, Trash2, Power } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchTradingAccount, saveTradingAccount, deleteTradingAccount, TradingAccountInfo,
} from "@/lib/features/algorithmTrade/tradingAccountAPI";

// 자동매매 계정(trading_accounts) 등록/수정/삭제 패널 (admin 전용, 선택 계정 kakaoId 대상)
export default function TradingAccountPanel({ country, balanceKey, onChanged }: {
  country: "KR" | "US"; balanceKey: string; onChanged?: () => void;
}) {
  const [info, setInfo] = useState<TradingAccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [appkey, setAppkey] = useState("");
  const [appsecret, setAppsecret] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [budget, setBudget] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!balanceKey || balanceKey === "undefined") return;
    setLoading(true);
    setMsg(null);
    const d = await fetchTradingAccount(country, balanceKey);
    setInfo(d);
    setAppkey("");
    setAppsecret("");
    setAccountNumber(d?.account_number ?? "");
    setBudget(d?.exists ? String(d.monthly_budget_krw ?? "") : "");
    setIsActive(d?.exists ? !!d.is_active : true);
    setLoading(false);
  }, [country, balanceKey]);

  useEffect(() => { load(); }, [load]);

  const onSave = async () => {
    setSaving(true);
    setMsg(null);
    const budgetNum = Math.trunc(Number(budget) || 0);
    const { ok, error } = await saveTradingAccount(country, {
      user_id: balanceKey,
      appkey: appkey.trim() || undefined,       // 빈값이면 기존 유지
      appsecret: appsecret.trim() || undefined, // 빈값이면 기존 유지
      account_number: accountNumber.trim() || undefined,
      monthly_budget_krw: budgetNum,
      is_active: isActive,
    });
    setSaving(false);
    if (ok) {
      setMsg({ type: "ok", text: "계정이 저장되었습니다." });
      await load();
      onChanged?.();
    } else {
      setMsg({ type: "err", text: error || "저장에 실패했습니다." });
    }
  };

  const onDelete = async () => {
    if (!window.confirm(`${country} 자동매매 계정을 삭제할까요? (등록된 종목/그룹은 유지되지만 자동매매는 중단됩니다)`)) return;
    setSaving(true);
    const okDel = await deleteTradingAccount(country, balanceKey);
    setSaving(false);
    if (okDel) {
      setMsg({ type: "ok", text: "계정이 삭제되었습니다." });
      await load();
      onChanged?.();
    } else {
      setMsg({ type: "err", text: "삭제에 실패했습니다." });
    }
  };

  const inputCls = "w-full rounded-lg border border-neutral-300 dark:border-[#4a4641] bg-white dark:bg-[#1a1915] px-3 py-2 text-sm";
  const exists = !!info?.exists;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#1a1915] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 dark:text-neutral-400">
          <KeyRound className="w-3.5 h-3.5" />
          {exists ? "등록된 계정" : "계정 미등록"}
          {exists && (
            <span className={cn("ml-1 rounded-full px-2 py-0.5 text-[10px] font-black",
              info?.is_active ? "bg-[#f0fdf4] text-[#16a34a] dark:bg-[#14532d]/30" : "bg-neutral-100 text-neutral-500 dark:bg-[#35332e]")}>
              <Power className="inline w-3 h-3 -mt-0.5 mr-0.5" />{info?.is_active ? "ON" : "OFF"}
            </span>
          )}
        </span>
        <span className="text-[11px] font-mono text-neutral-400">{balanceKey || "-"}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-neutral-500">App Key {exists && <span className="text-neutral-400">(미입력 시 기존 유지)</span>}</span>
          <input className={inputCls} value={appkey} onChange={e => setAppkey(e.target.value)}
            placeholder={info?.appkey_masked || "KIS App Key"} autoComplete="off" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-neutral-500">App Secret {exists && <span className="text-neutral-400">(미입력 시 기존 유지)</span>}</span>
          <input type="password" className={inputCls} value={appsecret} onChange={e => setAppsecret(e.target.value)}
            placeholder={info?.has_secret ? "●●●● 저장됨" : "KIS App Secret"} autoComplete="new-password" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-neutral-500">계좌번호</span>
          <input className={inputCls} value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
            placeholder="예: 50123456" autoComplete="off" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-neutral-500">월 예산(원)</span>
          <input type="number" min={0} step={100000} className={inputCls} value={budget} onChange={e => setBudget(e.target.value)}
            placeholder="예: 2000000" />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-300 cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-[#16a34a] focus:ring-[#16a34a]" />
          자동매매 활성화(ON)
        </label>
        {msg && (
          <span className={cn("text-xs font-bold", msg.type === "ok" ? "text-[#16a34a]" : "text-red-500")}>{msg.text}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {exists && (
            <button onClick={onDelete} disabled={saving}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-[#4a4641] px-3 py-2 text-xs font-bold text-neutral-500 hover:text-red-600 hover:border-red-300 disabled:opacity-50">
              <Trash2 className="w-3.5 h-3.5" /> 삭제
            </button>
          )}
          <button onClick={onSave} disabled={saving || loading}
            className="flex items-center gap-1.5 rounded-lg bg-[#16a34a] px-4 py-2 text-xs font-black text-white hover:bg-[#15803d] disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-neutral-400">
        KIS App Key/Secret·계좌번호를 등록하면 이 계정으로 자동매매가 실행됩니다. App Secret은 저장 후 다시 표시되지 않습니다(보안). 월 예산은 틱당 적립량(DCA) 계산에 사용됩니다.
      </p>
    </div>
  );
}
