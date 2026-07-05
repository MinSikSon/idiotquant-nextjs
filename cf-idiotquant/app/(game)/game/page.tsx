"use client";

// =========================================================================
// 종목 카드: 높다/낮다 (Higher-Lower) — 덱 빌딩 게임 1탄
// 두 종목 카드를 스탯(시가총액·저평가점수·NCAV·주가)으로 비교해 맞히면 연승.
// 정답을 맞힌 카드만 "내 덱"에 수집 → 계정별 D1 저장(로그인 필요).
// 연승↑ → 획득 확률↑, 높은 등급(메달) 카드일수록 더 높은 연승이 필요.
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
  { key: "per", label: "PER", get: it => safeNum(it.per), fmt: v => `${v.toFixed(1)}배` },
  { key: "last_price", label: "주가", get: it => safeNum(it.last_price), fmt: v => `${Math.round(v).toLocaleString()}원` },
];

// 카드 수집: 정답을 맞힌 카드만, 연승↑ → 획득 확률↑.
// 등급이 높을수록(보물>금>은) 더 높은 연승이 필요하도록 패널티를 준다.
const TIER_PENALTY: Record<string, number> = { muted: 0, bronze: 0, silver: 0.18, gold: 0.36, treasure: 0.6 };
function acquireChance(item: any, streak: number): number {
  const tone = computeValueScore(item).tone;
  return Math.min(0.85, Math.max(0, streak * 0.12 - (TIER_PENALTY[tone] ?? 0)));
}

// 덱 저장 실패 사유를 사람이 읽을 문구로 (401 로그인 / 404 미배포 / 500 마이그레이션)
function deckFailReason(res: any): string {
  const s = res?.status;
  if (s === 401) return "로그인이 필요해요 (로그인 후 다시 시도)";
  if (s === 404) return "서버(워커)가 아직 배포되지 않았어요";
  if (s === 500) return "서버 오류 — 덱 테이블(마이그레이션) 확인 필요";
  return res?.error ? String(res.error) : "저장 실패";
}

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

// 종목 로고 (KR: NEXT_PUBLIC_KR_LOGO_API, US: logo.dev). 실패 시 첫 글자 fallback. StockCard와 동일 소스.
function logoUrlFor(item: any): string {
  const t = String(item?.ticker ?? "");
  return item?.isUs
    ? `https://img.logo.dev/ticker/${t}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&size=200`
    : `${process.env.NEXT_PUBLIC_KR_LOGO_API}/${t}`;
}
function StockLogo({ item, size = 44 }: { item: any; size?: number }) {
  const [err, setErr] = useState(false);
  return (
    <div className="rounded-2xl border border-neutral-100 dark:border-[#35332e] bg-white shrink-0 flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size }}>
      {!err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrlFor(item)} alt={item?.name ?? "logo"} loading="lazy"
          className="w-full h-full object-contain p-1.5" onError={() => setErr(true)} />
      ) : (
        <span className="font-black text-neutral-500 leading-none" style={{ fontSize: size * 0.4 }}>
          {(item?.name ?? item?.ticker ?? "?").charAt(0)}
        </span>
      )}
    </div>
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
        // 모바일(<640px)에선 화면에 고정된 패널로(트리거 위치와 무관하게 항상 화면 안에 보임),
        // 모바일 하단 탭바(h-[64px], z-40)에 가리지 않도록 그 위로 띄우고 z-index도 더 높임.
        // sm 이상(하단 탭바 없음)에선 아이콘 옆에 뜨는 툴팁으로.
        <span className="fixed z-50 inset-x-4 bottom-20 sm:absolute sm:z-30 sm:inset-x-auto sm:left-0 sm:bottom-full sm:mb-2 sm:w-72 rounded-xl bg-neutral-900 dark:bg-[#242320] border border-neutral-700/60 dark:border-[#35332e] p-3 text-[11px] leading-relaxed text-neutral-200 shadow-xl text-left font-medium break-keep">
          <b className="text-white">저평가 점수 (0~100)</b><br />
          NCAV·PBR·PER·ROE를 가중 평균해 점수화(값 없는 지표는 제외 후 재분배):
          <span className="block mt-1.5 space-y-0.5 text-neutral-300">
            <span className="block">· NCAV 40% — 1.5배↑ 만점, 0.3배↓ 0점</span>
            <span className="block">· PBR 25% — 0.3↓ 만점, 1.5↑ 0점</span>
            <span className="block">· PER 20% — 5↓ 만점, 20↑ 0점</span>
            <span className="block">· ROE 15% — 18%↑ 만점, 3%↓ 0점</span>
          </span>
          <span className="block mt-1.5 text-neutral-300">등급: 🏆 보물 80+ · 🥇 금 65+ · 🥈 은 50+ · 🥉 동 35+ · 🧭 탐색 그 외</span>
        </span>
      )}
    </span>
  );
}

// 종목 카드
function Card({ item, stat, value }: { item: any; stat: Stat; value: React.ReactNode }) {
  return (
    <div className="w-full rounded-3xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] shadow-sm p-5 sm:p-6 flex flex-col items-center text-center">
      <StockLogo item={item} size={52} />
      <div className="mt-2"><Medal item={item} lg /></div>
      <p className="mt-2 font-black text-lg sm:text-xl text-neutral-900 dark:text-white leading-tight break-keep">{item.name}</p>
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
      <div className="flex items-center gap-2 mb-3">
        <StockLogo item={c} size={40} />
        <Medal item={c} lg />
        <ScoreInfo />
        <div className="min-w-0 ml-0.5">
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

// 이번 항해(연승) 기록 기반 등급 (전역 리더보드 대신 자체 랭크)
function rankOf(streak: number): { emoji: string; title: string } {
  if (streak >= 15) return { emoji: "👑", title: "전설의 선장" };
  if (streak >= 10) return { emoji: "🚢", title: "제독" };
  if (streak >= 6) return { emoji: "⚓", title: "선장" };
  if (streak >= 3) return { emoji: "🧭", title: "항해사" };
  return { emoji: "⛵", title: "견습 항해사" };
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
  const [newBest, setNewBest] = useState(false); // 이번 판에 최고 기록 경신
  const [lastWin, setLastWin] = useState<boolean | null>(null);
  const [dropped, setDropped] = useState(false);      // 이번 라운드 카드 획득(로그인)
  const [dropPrompt, setDropPrompt] = useState(false); // 카드가 떴지만 로그인 필요
  const [saveFail, setSaveFail] = useState<string | null>(null); // 덱 저장 실패 사유
  const [escaped, setEscaped] = useState<string | null>(null); // 높은 등급 카드가 도망감(메달)
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
    setStreak(0); setNewBest(false); setLastWin(null); setDropped(false); setDropPrompt(false); setSaveFail(null); setEscaped(null); setMissed(null); setPhase("guessing");
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
    setDropped(false); setDropPrompt(false); setSaveFail(null); setEscaped(null);
    setPhase("revealed");

    if (win) {
      const ns = streak + 1;
      setStreak(ns);
      if (ns > best) { setBest(ns); setNewBest(true); try { localStorage.setItem(bestKey, String(ns)); } catch { } }

      // 정답 카드만 수집. 연승↑ → 획득 확률↑, 높은 등급일수록 더 높은 연승 필요.
      if (Math.random() < acquireChance(challenger, ns)) {
        if (!isLoggedIn) {
          setDropPrompt(true);
        } else {
          const snap = toCard(challenger);
          addDeckCard(snap).then(res => {
            if (res?.added) {
              setDropped(true);
              setDeck(prev => prev.some(c => c.ticker === snap.ticker) ? prev : [snap, ...prev]);
            } else if (res?.success !== true) {
              // 서버가 저장을 못 함 → 사유를 화면에 노출 (조용히 실패 방지)
              setSaveFail(deckFailReason(res));
            }
            // res.success===true && !added → 이미 보유(중복) → 무시
          }).catch(() => setSaveFail("네트워크 오류"));
        }
      } else {
        // 높은 등급 카드가 도망감 → 연승 더 쌓으라는 힌트
        const v = computeValueScore(challenger);
        if (v.tone === "silver" || v.tone === "gold" || v.tone === "treasure") setEscaped(v.medal);
      }
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
  }, [phase, anchor, challenger, stat, best, bestKey, isLoggedIn, streak]);

  const next = useCallback(() => {
    if (!lastWin) return;
    setAnchor(challenger);
    setChallenger(draw(challenger?.ticker));
    setDropped(false); setDropPrompt(false); setSaveFail(null); setEscaped(null); setLastWin(null); setPhase("guessing");
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
                <p className="text-4xl mb-1">{rankOf(streak).emoji}</p>
                <p className="font-black text-lg text-neutral-900 dark:text-white">항해 종료!</p>
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f0fdf4] dark:bg-[#052e16]/40 border border-[#86efac]/60 dark:border-[#166534]/60 text-[#15803d] dark:text-[#16a34a] text-sm font-black">
                  {rankOf(streak).title} 등급
                </div>
                {newBest && streak > 0 && (
                  <p className="text-xs font-black text-amber-500 dark:text-amber-400 mt-2 animate-in fade-in zoom-in-95">🎉 신기록 달성!</p>
                )}
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">이번 연승 <b className="text-[#16a34a]">{streak}</b> · 최고 {best}</p>
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
                    saveFail
                      ? <span className="text-xs font-bold text-rose-500 dark:text-rose-400 animate-in fade-in">정답! 덱 저장 실패 — {saveFail}</span>
                      : escaped
                        ? <span className="text-xs font-bold text-amber-600 dark:text-amber-400 animate-in fade-in">정답! {escaped} 등급 카드가 도망갔어요 — 연승을 쌓으면 획득 확률↑</span>
                        : <span className="text-xs font-bold text-[#16a34a] animate-in fade-in">정답! ✔</span>
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

// 등급 카드 배경 틴트 (섹션·카드 모두에서 등급을 한눈에 구분)
const TIER_CARD_BG: Record<string, string> = {
  treasure: "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50",
  gold: "bg-yellow-50/60 dark:bg-yellow-950/10 border-yellow-200 dark:border-yellow-900/40",
  silver: "bg-neutral-100/70 dark:bg-[#2c2b27] border-neutral-200 dark:border-[#4a4641]",
  bronze: "bg-orange-50/60 dark:bg-orange-950/10 border-orange-200 dark:border-orange-900/40",
  muted: "bg-white dark:bg-[#242320] border-neutral-200 dark:border-[#35332e]",
};
const TIER_ORDER: Array<ReturnType<typeof computeValueScore>["tone"]> = ["treasure", "gold", "silver", "bronze", "muted"];

// 덱 뷰
function DeckView({ deck, isLoggedIn, onLogin, onClose }: { deck: DeckCardSnapshot[]; isLoggedIn: boolean; onLogin: () => void; onClose: () => void }) {
  // 등급별로 묶고, 등급 순서(보물→탐색) → 등급 내 점수 내림차순으로 정렬해 분류를 명확히 함
  const groups = useMemo(() => {
    const byTone = new Map<string, { item: DeckCardSnapshot; v: ReturnType<typeof computeValueScore> }[]>();
    for (const c of deck) {
      const v = computeValueScore(c);
      if (!byTone.has(v.tone)) byTone.set(v.tone, []);
      byTone.get(v.tone)!.push({ item: c, v });
    }
    for (const list of byTone.values()) list.sort((a, b) => b.v.score - a.v.score);
    return TIER_ORDER.filter(t => byTone.has(t)).map(t => ({ tone: t, cards: byTone.get(t)! }));
  }, [deck]);

  return (
    <div className="animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-4">
        <p className="font-black text-neutral-900 dark:text-white flex items-center gap-1.5">
          내 덱 <span className="text-[#16a34a]">{deck.length}</span>장
          <ScoreInfo />
        </p>
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
        <div className="space-y-5">
          {groups.map(({ tone, cards }) => (
            <div key={tone}>
              <div className="flex items-center gap-2 mb-2 px-0.5">
                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 ring-inset text-[11px] font-black", MEDAL_TONE[tone])}>
                  <span aria-hidden>{cards[0].v.medal}</span>{cards[0].v.label}
                </span>
                <span className="text-[11px] font-bold text-neutral-400">{cards.length}장</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {cards.map(({ item: c }) => (
                  <div key={c.ticker} className={cn("rounded-2xl border p-4 text-center flex flex-col items-center", TIER_CARD_BG[tone])}>
                    <StockLogo item={c} size={40} />
                    <div className="mt-1.5"><Medal item={c} /></div>
                    <p className="mt-1.5 font-bold text-sm text-neutral-900 dark:text-white truncate max-w-full">{c.name}</p>
                    <p className="text-[10px] text-neutral-400 font-mono">{c.ticker}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
