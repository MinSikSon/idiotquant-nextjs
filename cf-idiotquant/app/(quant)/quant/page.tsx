import { QUANT_FAQ as FAQ } from '@/lib/seo-content';
import Link from 'next/link';
import { ArrowRight, Filter, Search, Calculator } from 'lucide-react';
import { STRATEGY_PRESETS_CLIENT } from '@/lib/constants/strategies';

// "퀀트" 를 검색해 들어온 사람이 읽는 글.
//
// **서버 컴포넌트다.** 이 페이지의 값은 글 자체라, 자바스크립트가 실행돼야 글이 보이면
// 크롤러에게도 사람에게도 늦다. 상태도 클릭도 없으므로 "use client" 를 붙이지 않는다.
//
// 전략 표는 `STRATEGY_PRESETS_CLIENT` 를 그대로 읽는다 — 스크리너가 쓰는 그 기준이다.
// 여기에 기준을 다시 적으면 언젠가 둘이 어긋나고, 그때 이 글은 거짓말이 된다.



const STEPS = [
  {
    n: '1',
    title: '측정할 기준을 정합니다',
    body: 'PBR이 0.5배 미만인 종목처럼, 재무제표와 시세로 판단할 수 있는 조건을 정합니다.',
  },
  {
    n: '2',
    title: '같은 기준으로 종목을 거릅니다',
    body: '코스피·코스닥 종목의 PBR을 같은 기준으로 비교해 조건에 맞는 목록을 만듭니다.',
  },
  {
    n: '3',
    title: '조건에 맞는 기업을 살펴봅니다',
    body: '낮은 PBR이 적자나 부채 증가와 함께 나타났는지 재무제표에서 확인합니다.',
  },
];

const LIMITS = [
  {
    title: '과거 수익률과 미래 수익률은 다를 수 있습니다',
    body: '백테스트는 선택한 기간의 데이터로 전략을 검증합니다. 같은 전략도 기간이 달라지면 시장 수익률에 뒤처질 수 있습니다.',
  },
  {
    title: '적자 기업도 가격 조건을 통과할 수 있습니다',
    body: '낮은 PBR만으로는 연속 적자나 거래정지 위험을 판단하기 어렵습니다. 발굴 목록의 거래 상태와 분석 화면의 위험 점검을 함께 확인하세요.',
  },
  {
    title: '공시에는 시차가 있습니다',
    body: '기업은 분기가 끝난 뒤에 분기 보고서를 냅니다. 새 보고서가 나오기 전에는 최근 실적 변화가 재무 필터에 반영되지 않을 수 있습니다.',
  },
  {
    title: '거래가 적으면 원하는 가격에 체결하기 어렵습니다',
    body: '백테스트에서 가정한 가격과 실제 체결 가격이 달라지면 투자 수익률도 달라집니다.',
  },
];

const TOOLS = [
  {
    href: '/screener?mincap=500',
    icon: Filter,
    title: '종목 발굴',
    body: '재무 기준에 맞는 국내·미국 종목을 찾습니다.',
  },
  {
    href: '/analyze',
    icon: Search,
    title: '종목 분석',
    body: '종목별 재무제표, 적정주가 추정치, 상장폐지 위험 신호를 확인합니다.',
  },
  {
    href: '/calculator',
    icon: Calculator,
    title: '복리 수익률 계산기',
    body: '초기 투자금과 매월 적립금, 수익률을 넣어 복리와 세후·실질 금액을 비교합니다.',
  },
];

export default function QuantPage() {
  return (
    <div className="min-h-screen bg-surface-canvas dark:bg-surface-dark-canvas">
      <article className="desktop-guide-grid max-w-3xl lg:max-w-none mx-auto px-2 sm:px-6 py-10 sm:py-16">

        {/* ── 머리 ── */}
        <header>
          <h1 className="mt-3 text-[26px] sm:text-[38px] font-black leading-[1.3] text-neutral-900 dark:text-white break-keep">
            퀀트 투자란?
          </h1>
          <p className="mt-5 text-[15px] sm:text-base leading-[1.85] text-neutral-600 dark:text-neutral-300 break-keep">
            퀀트 투자는 재무지표나 주가처럼 측정할 수 있는 수치로 투자 기준을 정하는 방법입니다.
            예를 들어 코스피·코스닥 종목에 같은 PBR 기준을 적용해 조사할 기업을 추릴 수 있습니다.
          </p>
        </header>

        {/* ── 절차 ── */}
        <section className="mt-14">
          <h2 className="text-[20px] sm:text-[26px] font-black text-neutral-900 dark:text-white break-keep">
            재무 기준으로 종목 고르기
          </h2>
          <div className="mt-6 grid gap-3">
            {STEPS.map(s => (
              <div key={s.n} className="flex gap-4 rounded-2xl border border-neutral-200 dark:border-border-subtle-dark bg-white dark:bg-surface-dark-card p-4 sm:p-5">
                <span className="shrink-0 w-7 h-7 rounded-full bg-brand-light dark:bg-brand-muted/60 text-brand-ink grid place-items-center text-[13px] font-black">
                  {s.n}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-black text-neutral-900 dark:text-white">{s.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-[1.8] text-neutral-600 dark:text-neutral-300 break-keep">
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 전략 표 ── */}
        <section className="mt-14">
          <h2 className="text-[20px] sm:text-[26px] font-black text-neutral-900 dark:text-white break-keep">
            대표 퀀트 주식 전략 {STRATEGY_PRESETS_CLIENT.length}가지
          </h2>
          <p className="mt-3 text-[14px] leading-[1.85] text-neutral-600 dark:text-neutral-300 break-keep">
            IdiotQuant 종목 발굴에서 선택할 수 있는 전략입니다.
          </p>

          {/* 표가 아니라 목록이다. 세 칸짜리 표는 390px 화면에서 마지막 칸이 밖으로
              밀려나 옆으로 끌어야 읽히는데, 그 칸이 이 표에서 제일 중요한 말이다. */}
          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {STRATEGY_PRESETS_CLIENT.map(s => (
              <li
                key={s.id}
                className="rounded-2xl border border-neutral-200 dark:border-border-subtle-dark bg-white dark:bg-surface-dark-card p-4"
              >
                <h3 className="text-[14.5px] font-black text-neutral-900 dark:text-white">{s.label}</h3>
                <p className="mt-1 font-mono text-[12.5px] text-brand-ink break-all">{s.formula}</p>
                <p className="mt-2 text-[13px] leading-[1.75] text-neutral-600 dark:text-neutral-300 break-keep">
                  {s.plain}
                </p>
              </li>
            ))}
          </ul>

          <Link
            href="/screener?mincap=500"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand hover:bg-brand-hover px-5 py-3 text-[14px] font-bold text-white transition-colors"
          >
            종목 발굴에서 기준 적용하기
            <ArrowRight size={15} />
          </Link>
        </section>

        {/* ── 한계 ── */}
        <section className="mt-14">
          <h2 className="text-[20px] sm:text-[26px] font-black text-neutral-900 dark:text-white break-keep">
            재무 기준을 쓸 때 주의할 점
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {LIMITS.map(l => (
              <div key={l.title} className="rounded-2xl border border-neutral-200 dark:border-border-subtle-dark bg-white dark:bg-surface-dark-card p-4 sm:p-5">
                <h3 className="text-[14.5px] font-black text-neutral-900 dark:text-white break-keep">{l.title}</h3>
                <p className="mt-1.5 text-[13px] leading-[1.8] text-neutral-600 dark:text-neutral-300 break-keep">{l.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 시작하기 ── */}
        <section className="mt-14">
          <h2 className="text-[20px] sm:text-[26px] font-black text-neutral-900 dark:text-white break-keep">
            관련 도구
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {TOOLS.map(t => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className="group rounded-2xl border border-neutral-200 dark:border-border-subtle-dark bg-white dark:bg-surface-dark-card p-4 sm:p-5 hover:border-brand/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Icon size={15} className="text-brand-ink shrink-0" />
                    <h3 className="text-[14.5px] font-black text-neutral-900 dark:text-white break-keep">{t.title}</h3>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-[1.8] text-neutral-600 dark:text-neutral-300 break-keep">{t.body}</p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── FAQ ── 화면의 답변과 FAQPage 구조화 데이터가 같은 원본을 사용한다 */}
        <section className="mt-14">
          <h2 className="text-[20px] sm:text-[26px] font-black text-neutral-900 dark:text-white break-keep">
            퀀트 투자 자주 묻는 질문
          </h2>
          <div className="mt-6 divide-y divide-neutral-100 dark:divide-border-subtle-dark/60 rounded-2xl border border-neutral-200 dark:border-border-subtle-dark bg-white dark:bg-surface-dark-card">
            {FAQ.map(f => (
              <div key={f.q} className="p-4 sm:p-5">
                <h3 className="text-[14.5px] font-black text-neutral-900 dark:text-white break-keep">{f.q}</h3>
                <p className="mt-2 text-[13.5px] leading-[1.85] text-neutral-600 dark:text-neutral-300 break-keep">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-12 text-[11.5px] leading-relaxed text-neutral-400 dark:text-neutral-500 break-keep">
          이 글은 투자 참고용입니다. 투자 결정은 이용자 본인의 책임입니다.
        </p>
      </article>
    </div>
  );
}
