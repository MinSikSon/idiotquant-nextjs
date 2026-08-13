"use client";

import { useState } from "react";
import { STRATEGY_HEX, STRATEGY_PRESETS_CLIENT } from "@/lib/constants/strategies";

/* 표 위 요약 — 147행을 스크롤하기 전에 "이 결과가 대체로 어떤 모양인지"를 먼저 준다. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Item = Record<string, any>;
const num = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };
const roeOf = (i: Item) => (num(i.bps) > 0 ? (num(i.eps) / num(i.bps)) * 100 : 0);
// 95분위 — 축 상한용. 최댓값을 쓰면 이상치 하나가 나머지를 전부 원점으로 밀어붙인다.
const p95 = (xs: number[]) => {
  const v = xs.filter(x => x > 0).sort((a, b) => a - b);
  return v.length ? v[Math.min(v.length - 1, Math.floor(v.length * 0.95))] : 0;
};

const CARD = "rounded-xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] px-[15px] py-3.5";
const TITLE = "text-[10px] font-extrabold uppercase tracking-[0.08em] text-neutral-400 mb-2.5";

export function ResultSummary({ list }: { list: Item[] }) {
  if (list.length === 0) return null;

  // 분포(업종·전략)는 묶기 버튼 위 '결과 분포' 카드가 맡는다 — 같은 목록을 두 군데서
  // 세면 어느 쪽을 읽어야 할지 알 수 없다. 여기 남는 건 산점도 하나뿐이고,
  // 점 색의 범례는 그 카드의 전략 띠가 겸한다(같은 STRATEGY_HEX 를 쓴다).
  // 산점도 — 축 상한을 데이터에서 뽑는다. 고정 범위(PBR 1.0 / ROE 20%)를 쓰면 저평가
  //    모집단이 전부 좌하단 구석에 뭉쳐 아무것도 구분되지 않는다. 이상치 하나가 축을 잡아먹지
  //    않게 상한은 95분위로 잡고, 그보다 큰 값은 가장자리로 클램프한다.
  const scatter = list.filter(i => num(i.pbr) > 0);
  const xMax = Math.max(p95(scatter.map(i => num(i.pbr))), 0.1);
  const yMax = Math.max(p95(scatter.map(i => roeOf(i))), 1);
  // 점 크기는 일정하게 둔다. 예전에는 저평가 점수로 키웠는데, 등급 기준이 모호해 화면에서
  // 감춘 이상 "왜 이 점이 큰가"를 설명할 수 없는 채로 눈길만 끄는 셈이었다.
  const dots = scatter.map(i => {
    const strategy = STRATEGY_PRESETS_CLIENT.find(p => p.clientFilter?.(i))?.id ?? i.strategies?.[0];
    return {
      ticker: i.ticker,
      name: i.name,
      pbr: num(i.pbr),
      roe: roeOf(i),
      x: Math.min(num(i.pbr) / xMax, 1) * 100,
      y: Math.min(Math.max(roeOf(i), 0) / yMax, 1) * 100,
      size: 9,
      color: (strategy && STRATEGY_HEX[strategy]) || "#a3a3a3",
    };
  });

  return (
    <div className="mb-4">

      <div className={CARD}>
        <p className={TITLE}>싼 정도 × 버는 정도</p>
        <div className="relative h-[132px] border-l border-b border-neutral-200 dark:border-[#35332e]">
          {/* 우상단(싸고 잘 버는 쪽)으로 갈수록 옅은 초록 — 어느 방향이 좋은지 눈으로 알려준다 */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-[#16a34a]/[0.055] pointer-events-none" />
          {[25, 50, 75].map(v => (
            <div key={v} className="absolute inset-x-0 border-t border-dashed border-[#f2f0ec] dark:border-[#2c2b27]" style={{ bottom: `${v}%` }} />
          ))}
          {/* 색 = 전략. 위 '결과 분포' 카드의 전략 띠가 같은 색을 쓰므로 그게 곧 범례다. */}
          {dots.map(d => (
            <span
              key={d.ticker}
              title={`${d.name} · PBR ${d.pbr.toFixed(2)} · ROE ${d.roe.toFixed(1)}%`}
              className="absolute rounded-full opacity-75 -translate-x-1/2 translate-y-1/2 ring-[1.5px] ring-white dark:ring-[#242320]"
              style={{ left: `${d.x}%`, bottom: `${d.y}%`, width: d.size, height: d.size, background: d.color }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1.5 text-[9.5px] font-mono text-neutral-300 dark:text-neutral-600">
          <span>PBR 0 · ROE 0</span>
          <span className="font-sans">색 = 전략</span>
          <span>PBR {xMax.toFixed(2)} · ROE {yMax.toFixed(0)}%</span>
        </div>
      </div>

    </div>
  );
}

/* 지표 설명 스트립 — 첫 방문자는 펼친 채로 시작하고, 한 번 닫으면 기억한다. */
const TERMS = [
  { term: "NCAV 배수", rule: "≥ 1.0", desc: "순유동자산 ÷ 시가총액. 1을 넘으면 회사를 지금 팔아 빚을 다 갚아도 시가총액보다 더 남는다는 뜻입니다." },
  { term: "PBR", rule: "< 0.5", desc: "주가 ÷ 주당순자산. 1 미만이면 장부상 순자산보다 싸게 거래되고 있습니다." },
  { term: "ROE", rule: "≥ 8%", desc: "순이익 ÷ 자기자본. 자기 돈으로 얼마나 잘 버는지를 보는 수익성 지표입니다." },
];

export function TermStrip() {
  const [open, setOpen] = useState(() =>
    typeof window === "undefined" ? true : localStorage.getItem("screener:guide") !== "0"
  );
  const toggle = () => {
    setOpen(v => {
      localStorage.setItem("screener:guide", v ? "0" : "1");
      return !v;
    });
  };

  return (
    <div className="rounded-xl border border-[#fef3c7] dark:border-amber-900/40 bg-[#fffdf5] dark:bg-amber-950/10 px-[15px] py-3 mb-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11.5px] font-extrabold text-[#92400e] dark:text-amber-500">ⓘ 이 표의 숫자 읽는 법</p>
        <button onClick={toggle} className="text-[11px] font-bold text-[#a16207] dark:text-amber-600 hover:opacity-70">
          {open ? "접기" : "펼치기"}
        </button>
      </div>
      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3">
          {TERMS.map(t => (
            <div key={t.term} className="rounded-lg border border-[#fef3c7] dark:border-amber-900/40 bg-white dark:bg-[#242320] px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[11.5px] font-extrabold text-neutral-900 dark:text-neutral-100">{t.term}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#dcfce7] dark:bg-[#052e16]/60 text-[#16a34a] text-[10px] font-mono font-bold">{t.rule}</span>
              </div>
              <p className="text-[10.5px] leading-relaxed text-neutral-500 dark:text-neutral-400 break-keep">{t.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
