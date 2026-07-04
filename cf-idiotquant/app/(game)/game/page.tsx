"use client";

// =========================================================================
// 종목 카드: 높다/낮다 (Higher-Lower) — 덱 빌딩 게임 1탄
// 두 종목 카드를 스탯(시가총액·저평가점수·NCAV·주가)으로 비교해 맞히면 연승.
// 비교한 카드는 랜덤으로 "내 덱"에 수집 → 계정별 D1 저장(로그인 필요).
// 비로그인 시 수집 시점에 로그인 유도.
// =========================================================================

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowUp, ArrowDown, RotateCcw, Layers, TrendingUp, Sparkles, ChevronLeft, ChevronRight, Lock, Info } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { reqGetNcavDailyList, selectNcavDailyList } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { computeValueScore } from "@/lib/utils/valueScore";
import { getDeck, addDeckCard, type DeckCardSnapshot } from "@/lib/features/deck/deckAPI";
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

const DROP_CHANCE = 0.4; // 비교한 카드가 덱에 들어올 확률

function toCard(it: any): DeckCardSnapshot {
  return {
    ticker: String(it.ticker), name: String(it.name),
    market_cap: safeNum(it.market_cap), last_price: safeNum(it.last_price),
    ncav_ratio: safeNum(it.ncav_ratio), pbr: safeNum(it.pbr), per: safeNum(it.per),
    eps: safeNum(it.eps), bps: safeNum(it.bps),
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

// 저평가 점수 설명 툴팁 (마우스 오버 + 클릭, 모바일 대응)
function ScoreInfo() {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label="저평가 점수 설명" onClick={() => setOpen(o => !o)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-neutral-400 hover:text-[#16a34a] transition-colors">
        <Info size={13} />
      </button>
      {open && (
        <span className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 rounded-xl bg-neutral-900 dark:bg-[#242320] border border-neutral-700/60 dark:border-[#35332e] p-3 text-[11px] leading-relaxed text-neutral-200 shadow-xl text-left font-medium">
          <b className="text-white">저평가 점수 (0~100)</b><br />
          NCAV·PBR·PER·ROE를 종합해 저평가된 정도를 점수화. 높을수록 저평가 매력이 큽니다.
          <span className="block mt-1.5 text-neutral-300">🏆 보물 80+ · 🥇 금 65+ · 🥈 은 50+ · 🥉 동 35+ · 🧭 탐색 그 외</span>
        </span>
      )}
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

const fmtCap = (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(1)}조` : `${Math.round(v).toLocaleString()}억`);

// 항해 종료 시 틀린 종목 정보 카드 (무엇을 놓쳤는지 + 그 종목 지표 학습)
function MissedInfo({ missed }: { missed: any }) {
  const c = missed.challenger;
  const ncav = safeNum(c.ncav_ratio), pbr = safeNum(c.pbr);
  const metrics = [
    { label: "점수", value: `${computeValueScore(c).score}` },
    { label: "시총", value: fmtCap(safeNum(c.market_cap)) },
    { label: "NCAV", value: ncav > 0 ? `${ncav.toFixed(2)}x` : "—" },
    { label: "PBR", value: pbr > 0 ? pbr.toFixed(2) : "—" },
  ];
  return (
    <div className="mt-5 text-left rounded-2xl border border-neutral-200 dark:border-[#35332e] bg-[#faf9f7] dark:bg-[#1a1915] p-4">
      <p className="text-[11px] font-black text-rose-500 mb-2">아깝게 놓친 종목</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 break-keep leading-relaxed">
        <b className="text-neutral-800 dark:text-neutral-200">{c.name}</b>의 {missed.statLabel}
        <b className="text-neutral-700 dark:text-neutral-300"> {missed.challengerStr}</b>은{" "}
        {missed.anchor.name}({missed.anchorStr})보다{" "}
        <b className={missed.higherSide === "challenger" ? "text-[#16a34a]" : "text-rose-500"}>
          {missed.higherSide === "challenger" ? "높았어요" : "낮았어요"}
        </b>.
      </p>
      <div className="flex items-center gap-1.5 mb-3">
        <Medal item={c} lg />
        <ScoreInfo />
        <div className="min-w-0 ml-1">
          <p className="font-black text-sm text-neutral-900 dark:text-white truncate">{c.name}</p>
          <p className="text-[10px] text-neutral-400 font-mono">{c.ticker}</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {metrics.map(m => (
          <div key={m.label} className="rounded-lg bg-white dark:bg-[#242320] p-2 text-center">
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">{m.label}</p>
            <p className="text-xs font-black tabular-nums text-neutral-800 dark:text-neutral-200 mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>
      <Link href={`/analyze?ticker=${encodeURIComponent(c.name)}&from=game`}
        className="inline-flex items-center gap-1 text-xs font-bold text-[#16a34a] hover:underline">
        이 종목 분석하기 <ChevronRight size={12} />
      </Link>
    </div>
  );
}

type Phase = "loading" | "guessing" | "revealed" | "over";

export default function GamePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const ncav = useAppSelector(selectNcavDailyList);
  const { data: session } = useSession();
  const isLoggedIn = !!session;

  const requireLogin = useCallback(() => {
    router.push(`/login?callbackUrl=${encodeURIComponent("/game")}`);
  }, [router]);

  const [statKey, setStatKey] = useState("market_cap");
  const stat = useMemo(() => STATS.find(s => s.key === statKey)!, [statKey]);

  const [anchor, setAnchor] = useState<any | null>(null);
  const [challenger, setChallenger] = useState<any | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [lastWin, setLastWin] = useState<boolean | null>(null);
  const [dropped, setDropped] = useState(false);      // 이번 라운드 카드 획득(로그인)
  const [dropPrompt, setDropPrompt] = useState(false); // 카드가 떴지만 로그인 필요
  const [deck, setDeck] = useState<DeckCardSnapshot[]>([]);
  const [showDeck, setShowDeck] = useState(false);
  const [missed, setMissed] = useState<any | null>(null); // 항해 종료 시 틀린 종목 정보

  useEffect(() => { dispatch(reqGetNcavDailyList("latest")); }, [dispatch]);

  // 로그인 상태면 계정 덱 로드
  useEffect(() => {
    if (!isLoggedIn) { setDeck([]); return; }
    let cancelled = false;
    getDeck().then(res => {
      if (cancelled || !res?.success || !Array.isArray(res.data)) return;
      setDeck(res.data.map((r: any) => ({ ticker: r.ticker, name: r.name, ...(r.card ?? {}) })));
    }).catch(() => { });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

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
    setAnchor(a); setChallenger(draw(a.ticker));
    setStreak(0); setLastWin(null); setDropped(false); setDropPrompt(false); setMissed(null); setPhase("guessing");
  }, [draw]);

  const started = useRef(false);
  useEffect(() => {
    if (!started.current && pool.length >= 2) { started.current = true; start(); }
  }, [pool, start]);

  const guess = useCallback((dir: "higher" | "lower") => {
    if (phase !== "guessing" || !anchor || !challenger) return;
    const av = stat.get(anchor), cv = stat.get(challenger);
    const win = dir === "higher" ? cv >= av : cv <= av;   // 동점은 승리 처리
    setLastWin(win);
    setDropped(false); setDropPrompt(false);
    setPhase("revealed");

    if (win) {
      setStreak(s => {
        const ns = s + 1;
        if (ns > best) { setBest(ns); try { localStorage.setItem(bestKey, String(ns)); } catch { } }
        return ns;
      });
    } else {
      // 틀린 라운드 정보 스냅샷 (statKey 변경과 무관하게 종료 화면에서 표시)
      setMissed({
        challenger, anchor,
        statLabel: stat.label,
        anchorStr: stat.fmt(av),
        challengerStr: stat.fmt(cv),
        higherSide: cv >= av ? "challenger" : "anchor",
      });
    }

    // 비교한 카드 랜덤 수집 (계정 저장)
    if (Math.random() < DROP_CHANCE) {
      if (!isLoggedIn) {
        setDropPrompt(true);
      } else {
        const snap = toCard(challenger);
        addDeckCard(snap).then(res => {
          if (res?.added) {
            setDropped(true);
            setDeck(prev => prev.some(c => c.ticker === snap.ticker) ? prev : [snap, ...prev]);
          }
        }).catch(() => { });
      }
    }
  }, [phase, anchor, challenger, stat, best, bestKey, isLoggedIn]);

  const next = useCallback(() => {
    if (!lastWin) return;
    setAnchor(challenger);
    setChallenger(draw(challenger?.ticker));
    setDropped(false); setDropPrompt(false); setLastWin(null); setPhase("guessing");
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
            {!isLoggedIn && <Lock size={10} className="opacity-60" />}
          </button>
        </div>

        {/* 덱 뷰 */}
        {showDeck ? (
          <DeckView deck={deck} isLoggedIn={isLoggedIn} onLogin={requireLogin} onClose={() => setShowDeck(false)} />
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
                <p className="text-xs text-neutral-400 mt-2">
                  {isLoggedIn ? <>발굴한 카드는 <b>내 덱({deck.length})</b>에 쌓였습니다.</> : "로그인하면 발굴한 카드를 덱에 모을 수 있어요."}
                </p>
                {missed && <MissedInfo missed={missed} />}
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

                {/* 획득 / 로그인 유도 */}
                <div className="min-h-[1.75rem] mt-2 text-center">
                  {phase === "revealed" && dropped && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 animate-in fade-in slide-in-from-bottom-1">
                      <Sparkles size={12} /> 카드 획득! {challenger.name} 이(가) 덱에 추가됨
                    </span>
                  )}
                  {phase === "revealed" && dropPrompt && (
                    <button onClick={requireLogin}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16a34a] animate-in fade-in hover:underline">
                      <Lock size={12} /> 카드가 나왔어요! 로그인하고 덱에 담기 →
                    </button>
                  )}
                  {phase === "revealed" && lastWin && !dropped && !dropPrompt && (
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

// 덱 뷰
function DeckView({ deck, isLoggedIn, onLogin, onClose }: { deck: DeckCardSnapshot[]; isLoggedIn: boolean; onLogin: () => void; onClose: () => void }) {
  const sorted = useMemo(() => [...deck].sort((a, b) => computeValueScore(b).score - computeValueScore(a).score), [deck]);
  return (
    <div className="animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-4">
        <p className="font-black text-neutral-900 dark:text-white">내 덱 <span className="text-[#16a34a]">{deck.length}</span>장</p>
        <button onClick={onClose} className="text-xs font-bold text-neutral-500 hover:text-[#16a34a]">게임으로 ▶</button>
      </div>
      {!isLoggedIn ? (
        <div className="py-16 text-center">
          <Lock size={22} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
          <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">덱은 계정에 저장됩니다</p>
          <p className="text-xs text-neutral-400 mt-1 mb-4">로그인하면 발굴한 카드가 기기와 상관없이 보관돼요.</p>
          <button onClick={onLogin} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-sm">
            로그인하고 덱 시작
          </button>
        </div>
      ) : deck.length === 0 ? (
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
