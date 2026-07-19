"use client";

// 카드 게임 지갑/상점 UI — 코인 잔액, 중복 카드 전환, 확률 부스트 구매.
// 코인 차감(spend)·전환(convert)은 서버가 검증하지만, 부스트 자체의 효과(확률 상승·라운드 소진)는
// GamePage가 세션 동안 로컬로만 추적한다 (뽑기 판정 자체가 이미 클라이언트 판정이므로 서버가
// "라운드 수"까지 추적할 필요가 없음 — 신뢰 경계는 기존 획득 로직과 동일 수준).

import { useState } from "react";
import { Coins, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { convertDupes, spendCoins, type DeckCardSnapshot } from "@/lib/features/deck/deckAPI";
import { computeValueScore } from "@/lib/utils/valueScore";
import { type DeckItem } from "./page";

// 워커 COIN_VALUE(d1Store.js)와 동일한 등급→코인 표 — 전환 팝오버에 예상 획득량을 보여주기 위한 표시용 사본.
const COIN_VALUE: Record<string, number> = { explore: 2, clay: 3, raw: 3, iron: 4, bronze: 5, silver: 8, gold: 12, diamond: 18, treasure: 25, legend: 40 };

export function WalletChip({ coins }: { coins: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs font-black tabular-nums">
      <Coins size={13} /> {coins}
    </span>
  );
}

// 덱 카드(count>=2)에 붙는 "중복 전환" 소형 버튼 — 클릭 시 개수 선택 인라인 패널
export function ConvertButton({ item, count, onConverted }: {
  item: DeckCardSnapshot; count: number; onConverted: (gained: number, remaining: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const max = count - 1; // 최소 1장은 남김
  const tone = computeValueScore(item).tone;
  const perCard = COIN_VALUE[tone] ?? COIN_VALUE.explore;
  if (max < 1) return null;

  const convert = async () => {
    setPending(true); setError(null);
    const res = await convertDupes(item.ticker, amount, tone);
    setPending(false);
    if (res?.success) {
      onConverted(res.gained, res.remaining);
      setOpen(false); setAmount(1);
    } else {
      setError(res?.error ?? "전환 실패");
    }
  };

  return (
    <span className="absolute bottom-1 left-1 z-[5]" onClick={e => e.stopPropagation()}>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/70 text-amber-300 text-[9px] font-black">
          <Coins size={9} /> 전환
        </button>
      ) : (
        <span className="flex flex-col gap-1 px-1.5 py-1 rounded-lg bg-black/85 text-white text-[9px] w-max">
          <span className="flex items-center gap-1">
            <input type="number" min={1} max={max} value={amount}
              onChange={e => setAmount(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
              className="w-8 bg-white/10 rounded px-1 py-0.5 text-center" />
            <button type="button" disabled={pending} onClick={convert} className="font-black text-amber-300 disabled:opacity-50">
              {pending ? "…" : "확인"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-neutral-400"><X size={10} /></button>
          </span>
          <span className="text-neutral-400">1장당 🪙{perCard} · 예상 <b className="text-amber-300">🪙{perCard * amount}</b></span>
        </span>
      )}
      {error && <span className="block mt-0.5 px-1 py-0.5 rounded bg-rose-950/80 text-rose-300 text-[8px]">{error}</span>}
    </span>
  );
}

// 상점 아이템 — v1은 확률 부스트 하나로 시작
export const BOOST_ITEMS = [
  { id: "charm_small", label: "행운의 부적", desc: "다음 5판 동안 획득 확률 ×1.5", cost: 50, rounds: 5, mult: 1.5 },
] as const;
export type BoostItem = typeof BOOST_ITEMS[number];

export function ShopPanel({ coins, onBuy, onClose }: {
  coins: number; onBuy: (item: BoostItem) => void; onClose: () => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buy = async (item: BoostItem) => {
    setPendingId(item.id); setError(null);
    const res = await spendCoins(item.cost);
    setPendingId(null);
    if (res?.success) onBuy(item);
    else setError(res?.error ?? "구매 실패");
  };

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-black text-neutral-900 dark:text-white flex items-center gap-1.5">
          <Sparkles size={15} className="text-amber-500" /> 상점 <WalletChip coins={coins} />
        </p>
        <button onClick={onClose} className="text-xs font-bold text-neutral-500 hover:text-[#16a34a]">닫기 ▶</button>
      </div>
      <p className="text-[11px] text-neutral-400 mb-3 break-keep">
        🪙 코인은 <b className="text-neutral-600 dark:text-neutral-300">내 덱에서 중복 카드(×2 이상)를 전환</b>하면 모을 수 있어요. 등급이 높을수록 더 많이 받아요.
      </p>
      <div className="space-y-2">
        {BOOST_ITEMS.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-100 dark:border-[#35332e] bg-[#faf9f7] dark:bg-[#1f1e1b] p-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{item.label}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">{item.desc}</p>
            </div>
            <button type="button" disabled={coins < item.cost || pendingId === item.id} onClick={() => buy(item)}
              className={cn("shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition-colors",
                coins < item.cost ? "bg-neutral-200 dark:bg-[#35332e] text-neutral-400 cursor-not-allowed"
                  : "bg-amber-500 hover:bg-amber-600 text-white")}>
              <Coins size={12} /> {item.cost}
            </button>
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-[11px] font-bold text-rose-500">{error}</p>}
    </div>
  );
}
