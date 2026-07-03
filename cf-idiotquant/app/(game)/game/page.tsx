"use client";

// =========================================================================
// 종목 카드: 높다/낮다 (Higher-Lower) — 덱 빌딩 게임 1탄
// 두 종목 카드를 스탯(시가총액·저평가점수·NCAV·주가)으로 비교해 맞히면 연승.
// 비교한 카드는 랜덤으로 "내 덱리스트"(localStorage)에 수집 → 이후 게임의 밑천.
// =========================================================================

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown, RotateCcw, Layers, TrendingUp, Sparkles, ChevronLeft } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { reqGetNcavDailyList, selectNcavDailyList } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { computeValueScore } from "@/lib/utils/valueScore";
import { cn } from "@/lib/utils";

const safeNum = (v: any): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// 비교 가능한 스탯 정의
type Stat = { key: string; label: string; get: (it: any) => number; fmt: (v: number) => string };
const STATS: Stat[] = [
  {
    key: "market_cap", label: "시가총액", get: it => safeNum(it.market_cap),
    fmt: v => v >= 10000 ? `${(v / 10000).toFixed(1)}조` : `${Math.round(v).toLocaleString()}억`,
  },
  { key: "value_score", label: "저평가 점수", get: it => computeValueScore(it).score, fmt: v => `${v}점` },
  { key: "ncav_ratio", label: "NCAV 비율", get: it => safeNum(it.ncav_ratio), fmt: v => `${v.toFixed(2)}x` },
  { key: "last_price", label: "주가", get: it => safeNum(it.last_price), fmt: v => `${Math.round(v).toLocaleString()}원` },
];

const DECK_KEY = "iq:deck:v1";        // 내 덱리스트 (소유 카드) — 이후 게임들이 공유
const DROP_CHANCE = 0.4;              // 비교한 카드가 덱에 들어올 확률

type DeckCard = { ticker: string; name: string; market_cap: number; last_price: number; ncav_ratio: number; pbr: number; per: number; eps: number; bps: number; at: number };

function loadDeck(): DeckCard[] {
  try { return JSON.parse(localStorage.getItem(DECK_KEY) || "[]"); } catch { return []; }
}
function toCard(it: any): DeckCard {
  return {
    ticker: String(it.ticker), name: String(it.name),
    market_cap: safeNum(it.market_cap), last_price: safeNum(it.last_price),
    ncav_ratio: safeNum(it.ncav_ratio), pbr: safeNum(it.pbr), per: safeNum(it.per),
    eps: safeNum(it.eps), bps: safeNum(it.bps), at: Date.now(),
  };
}

// 메달 톤
const MEDAL_TONE: Record<string, string> = {
  treasure: "bg-amber-100 text-amber-700 ring-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800",
  gold: "bg-yellow-50 text-yellow-700 ring-yellow-300 dark:bg-yellow-950/30 dark:text-yellow-300 dark:ring-yellow-800",
  silver: "bg-neutral-100 text-neutral-600 ring-neutral-300 dark:bg-[#2c2b27] dark:text-neutral-300 dark:ring-[#4a4641]",
  bronze: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:ring-orange-900",
  muted: "bg-neutral-50 text-neutral-400 ring-neutral-200 dark:bg-[#242320] dark:text-neutral-500 dark:ring-[#35332e]",
};

function Medal({ item, lg }: { item: any; lg?: boolean }) {
  const v = computeValueScore(item);
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full ring-1 ring-inset font-black tabular-nums",
      lg ? "px-2.5 py-1 text-sm" : "px-1.5 py-0.5 text-[11px]", MEDAL_TONE[v.tone])}>
      <span aria-hidden>{v.medal}</span>{v.score}
    </span>
  );
}

// 종목 카드
function Card({ item, stat, value }: { item: any; stat: Stat; value: React.ReactNode }) {
  return (
    <div className="w-full rounded-3xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] shadow-sm p-5 sm:p-6 flex flex-col items-center text-center">
      <Medal item={item} lg />
      <p className="mt-3 font-black text-lg sm:text-xl text-neutral-900 dark:text-white leading-tight break-keep">{item.name}</p>
      <p className="text-[11px] text-neutral-400 font-mono tracking-wider">{item.ticker}</p>
      <div className="my-4 h-px w-16 bg-neutral-100 dark:bg-[#35332e]" />
      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{stat.label}</p>
      <div className="mt-1 text-2xl sm:text-3xl font-black tabular-nums text-[#16a34a] dark:text-[#16a34a] min-h-[2.5rem] flex items-center">
        {value}
      </div>
    </div>
  );
}

type Phase = "loading" | "guessing" | "revealed" | "over";

export default function GamePage() {
  const dispatch = useAppDispatch();
  const ncav = useAppSelector(selectNcavDailyList);

  const [statKey, setStatKey] = useState("market_cap");
  const stat = useMemo(() => STATS.find(s => s.key === statKey)!, [statKey]);

  const [anchor, setAnchor] = useState<any | null>(null);
  const [challenger, setChallenger] = useState<any | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [lastWin, setLastWin] = useState<boolean | null>(null);
  const [dropped, setDropped] = useState(false);          // 이번 라운드에 카드 획득했는지
  const [deck, setDeck] = useState<DeckCard[]>([]);
  const [showDeck, setShowDeck] = useState(false);

  useEffect(() => { dispatch(reqGetNcavDailyList("latest")); setDeck(loadDeck()); }, [dispatch]);

  // 현재 스탯으로 비교 가능한 종목 풀
  const pool = useMemo(() => {
    const list = Array.isArray(ncav.list) ? ncav.list : [];
    return list.filter((it: any) => it?.name && it?.ticker && stat.get(it) > 0);
  }, [ncav.list, stat]);

  const bestKey = `iq:game:best:hl:${statKey}`;
  useEffect(() => { setBest(safeNum(typeof window !== "undefined" ? localStorage.getItem(bestKey) : 0)); }, [bestKey]);

  const draw = useCallback((excludeTicker?: string) => {
    if (pool.length < 2) return null;
    for (let i = 0; i < 30; i++) {
      const c = pool[Math.floor(Math.random() * pool.length)];
      if (c.ticker !== excludeTicker) return c;
    }
    return pool[0];
  }, [pool]);

  const start = useCallback(() => {
    const a = draw();
    if (!a) return;
    setAnchor(a); setChallenger(draw(a.ticker)); setStreak(0); setLastWin(null); setDropped(false); setPhase("guessing");
  }, [draw]);

  // 풀 준비되면 시작
  const started = useRef(false);
  useEffect(() => {
    if (!started.current && pool.length >= 2) { started.current = true; start(); }
  }, [pool, start]);

  // 비교한 카드를 랜덤으로 덱에 수집 (중복 티커는 제외)
  const maybeCollect = useCallback((it: any) => {
    if (Math.random() >= DROP_CHANCE) return false;
    let added = false;
    setDeck(prev => {
      if (prev.some(c => c.ticker === String(it.ticker))) return prev;
      added = true;
      const next = [toCard(it), ...prev];
      try { localStorage.setItem(DECK_KEY, JSON.stringify(next)); } catch { }
      return next;
    });
    return added;
  }, []);

  const guess = useCallback((dir: "higher" | "lower") => {
    if (phase !== "guessing" || !anchor || !challenger) return;
    const av = stat.get(anchor), cv = stat.get(challenger);
    const win = dir === "higher" ? cv >= av : cv <= av;   // 동점은 승리 처리
    setLastWin(win);
    setDropped(maybeCollect(challenger));
    setPhase("revealed");
    if (win) {
      setStreak(s => {
        const ns = s + 1;
        if (ns > best) { setBest(ns); try { localStorage.setItem(bestKey, String(ns)); } catch { } }
        return ns;
      });
    }
  }, [phase, anchor, challenger, stat, best, bestKey, maybeCollect]);

  const next = useCallback(() => {
    if (!lastWin) return;
    setAnchor(challenger);
    setChallenger(draw(challenger?.ticker));
    setDropped(false); setLastWin(null); setPhase("guessing");
  }, [lastWin, challenger, draw]);

  useEffect(() => { if (phase === "revealed" && lastWin === false) setPhase("over"); }, [phase, lastWin]);

  const isLoading = ncav.state === "pending" || ncav.state === "init" || pool.length < 2;

  return (
    <div className="min-h-screen bg-[#faf9f7] dark:bg-[#1a1915] transition-colors">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="inline-flex items-center gap-1 text-xs font-bold text-neutral-500 dark:text-neutral-400 hover:text-[#16a34a]">
            <ChevronLeft size={14} /> 홈
          </Link>
          <h1 className="text-sm font-black text-neutral-900 dark:text-white">종목 카드 · 높다/낮다</h1>
          <button onClick={() => setShowDeck(v => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] text-xs font-bold text-neutral-600 dark:text-neutral-300">
            <Layers size={13} className="text-[#16a34a]" /> 내 덱 {deck.length}
          </button>
        </div>

        {/* 덱리스트 뷰 */}
        {showDeck ? (
          <DeckView deck={deck} onClose={() => setShowDeck(false)} />
        ) : isLoading ? (
          <div className="py-24 text-center text-sm text-neutral-400">카드 데이터를 불러오는 중…</div>
        ) : (
          <>
            {/* 스탯 선택 */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
              {STATS.map(s => (
                <button key={s.key}
                  onClick={() => { setStatKey(s.key); started.current = false; }}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                    s.key === statKey
                      ? "bg-[#16a34a] border-[#16a34a] text-white shadow-sm"
                      : "bg-white dark:bg-[#242320] border-neutral-200 dark:border-[#35332e] text-neutral-500 dark:text-neutral-400 hover:border-[#86efac]")}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* 스코어 */}
            <div className="flex items-center justify-center gap-6 mb-5 text-center">
              <div>
                <p className="text-2xl font-black tabular-nums text-[#16a34a]">{streak}</p>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">연승</p>
              </div>
              <div className="h-8 w-px bg-neutral-200 dark:bg-[#35332e]" />
              <div>
                <p className="text-2xl font-black tabular-nums text-neutral-700 dark:text-neutral-200">{best}</p>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">최고 기록</p>
              </div>
            </div>

            {phase === "over" ? (
              <div className="rounded-3xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                <p className="text-3xl mb-2">🚢</p>
                <p className="font-black text-lg text-neutral-900 dark:text-white">항해 종료!</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">이번 연승 <b className="text-[#16a34a]">{streak}</b> · 최고 {best}</p>
                <p className="text-xs text-neutral-400 mt-2">발굴한 카드는 <b>내 덱({deck.length})</b>에 쌓였습니다.</p>
                <button onClick={start}
                  className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-sm shadow-md">
                  <RotateCcw size={15} /> 다시 시작
                </button>
              </div>
            ) : anchor && challenger ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 items-stretch">
                  <Card item={anchor} stat={stat} value={stat.fmt(stat.get(anchor))} />
                  <Card item={challenger} stat={stat}
                    value={phase === "revealed"
                      ? <span className="animate-in zoom-in-75 duration-300">{stat.fmt(stat.get(challenger))}</span>
                      : <span className="text-neutral-300 dark:text-neutral-600">?</span>} />
                </div>

                {/* 획득 알림 */}
                <div className="h-6 mt-2 text-center">
                  {phase === "revealed" && dropped && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 animate-in fade-in slide-in-from-bottom-1">
                      <Sparkles size={12} /> 카드 획득! {challenger.name} 이(가) 덱에 추가됨
                    </span>
                  )}
                  {phase === "revealed" && lastWin && !dropped && (
                    <span className="text-xs font-bold text-[#16a34a] animate-in fade-in">정답! ✔</span>
                  )}
                </div>

                {/* 액션 */}
                {phase === "guessing" ? (
                  <div className="mt-3">
                    <p className="text-center text-xs text-neutral-400 mb-3">
                      오른쪽 <b className="text-neutral-600 dark:text-neutral-300">{challenger.name}</b> 의 {stat.label}은 왼쪽보다?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => guess("higher")}
                        className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] text-white font-black shadow-md active:scale-[0.98] transition-all">
                        <ArrowUp size={18} /> 높다
                      </button>
                      <button onClick={() => guess("lower")}
                        className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-neutral-800 hover:bg-neutral-900 dark:bg-[#35332e] dark:hover:bg-[#413f39] text-white font-black shadow-md active:scale-[0.98] transition-all">
                        <ArrowDown size={18} /> 낮다
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={next}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] text-white font-black shadow-md animate-in fade-in">
                    다음 카드 <TrendingUp size={16} />
                  </button>
                )}
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

// 덱리스트 뷰
function DeckView({ deck, onClose }: { deck: DeckCard[]; onClose: () => void }) {
  const sorted = useMemo(() => [...deck].sort((a, b) => computeValueScore(b).score - computeValueScore(a).score), [deck]);
  return (
    <div className="animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-4">
        <p className="font-black text-neutral-900 dark:text-white">내 덱 <span className="text-[#16a34a]">{deck.length}</span>장</p>
        <button onClick={onClose} className="text-xs font-bold text-neutral-500 hover:text-[#16a34a]">게임으로 ▶</button>
      </div>
      {deck.length === 0 ? (
        <p className="py-20 text-center text-sm text-neutral-400">아직 카드가 없어요. 게임을 하며 카드를 수집하세요!</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sorted.map(c => (
            <div key={c.ticker} className="rounded-2xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] p-4 text-center">
              <Medal item={c} />
              <p className="mt-2 font-bold text-sm text-neutral-900 dark:text-white truncate">{c.name}</p>
              <p className="text-[10px] text-neutral-400 font-mono">{c.ticker}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
