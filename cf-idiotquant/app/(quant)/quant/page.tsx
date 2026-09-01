import Link from 'next/link';
import { ArrowRight, Filter, Search, Calculator, Gamepad2 } from 'lucide-react';
import { STRATEGY_PRESETS_CLIENT } from '@/lib/constants/strategies';

// "퀀트" 를 검색해 들어온 사람이 읽는 글.
//
// **서버 컴포넌트다.** 이 페이지의 값은 글 자체라, 자바스크립트가 실행돼야 글이 보이면
// 크롤러에게도 사람에게도 늦다. 상태도 클릭도 없으므로 "use client" 를 붙이지 않는다.
//
// 전략 표는 `STRATEGY_PRESETS_CLIENT` 를 그대로 읽는다 — 스크리너가 쓰는 그 기준이다.
// 여기에 기준을 다시 적으면 언젠가 둘이 어긋나고, 그때 이 글은 거짓말이 된다.

const FAQ = [
  {
    q: '퀀트 투자란 무엇인가요?',
    a: '퀀트(quant) 투자는 정량(quantitative) 지표로 규칙을 먼저 정하고, 그 규칙을 모든 종목에 똑같이 적용해 종목을 고르는 방법입니다. "PBR 0.5 미만" 처럼 숫자로 적을 수 있는 기준만 쓰기 때문에, 같은 기준이면 누가 언제 돌려도 같은 목록이 나옵니다. 뉴스나 감이 아니라 재무제표와 시세라는 같은 데이터를 봅니다.',
  },
  {
    q: '퀀트 투자는 프로그래밍을 할 줄 알아야 하나요?',
    a: '아닙니다. 파이썬으로 직접 데이터를 받아 돌리는 방법도 있지만, 기준이 이미 정해진 스크리너를 쓰면 코드 없이 같은 일을 할 수 있습니다. IdiotQuant는 코스피·코스닥 전 종목에 NCAV·저PBR·저PER·S-RIM 등의 기준을 매일 적용한 결과를 가입 없이 무료로 보여 줍니다.',
  },
  {
    q: '퀀트 투자에서 가장 많이 쓰는 전략은 무엇인가요?',
    a: '자산 기준으로는 NCAV(순유동자산 > 시가총액)와 저PBR(PBR 0.5 미만), 이익 기준으로는 저PER(PER 10 미만, 흑자)과 마법공식(PER 15 미만 & ROE 10% 초과)이 대표적입니다. 둘을 합친 그레이엄 기준(PER × PBR < 22.5)과 초과이익모델 S-RIM(ROE 8% 초과 & PBR 1.0 미만)도 널리 쓰입니다.',
  },
  {
    q: '퀀트 투자는 무조건 수익이 나나요?',
    a: '아닙니다. 퀀트는 과거 데이터에서 통했던 규칙을 앞으로도 쓰는 방법이라, 그 규칙이 통하지 않는 구간이 몇 년씩 이어질 수 있습니다. 싼 데는 이유가 있는 종목(적자 지속, 상장폐지 위험, 거래량 부족)이 기준에 걸려 올라오기도 하므로, 스크리너가 내준 목록은 매수 목록이 아니라 조사 목록으로 봐야 합니다.',
  },
  {
    q: '퀀트 주식 스크리너는 무료인가요?',
    a: 'IdiotQuant의 종목 발굴(스크리너)과 오늘의 발굴 결과는 가입 없이 무료입니다. 카카오 로그인을 하면 종목별 상세 재무분석, 목표주가 계산(DCF·RIM·그레이엄), 상장폐지 위험도까지 무료로 볼 수 있습니다.',
  },
];

const STEPS = [
  {
    n: '1',
    title: '기준을 숫자로 적는다',
    body: '"싸다" 를 "PBR 0.5 미만" 처럼 계산할 수 있는 문장으로 바꿉니다. 이 한 줄이 퀀트의 전부입니다 — 숫자로 못 적으면 규칙이 아니라 취향입니다.',
  },
  {
    n: '2',
    title: '모든 종목에 같은 잣대를 댄다',
    body: '아는 회사부터 보지 않고 코스피·코스닥 전 종목에 같은 기준을 댑니다. 사람이 고르면 이름을 아는 회사만 후보가 되는데, 그 편향이 곧 손실입니다.',
  },
  {
    n: '3',
    title: '남은 것만 들여다본다',
    body: '2,000곳이 수십 곳으로 줄어든 뒤부터 사람이 할 일이 시작됩니다. 왜 쌌는지, 계속 쌀 이유가 있는지는 규칙이 아니라 사람이 판단합니다.',
  },
];

const LIMITS = [
  {
    title: '과거에 통한 규칙일 뿐이다',
    body: '백테스트 성적은 그 규칙이 과거에 통했다는 뜻이지, 앞으로도 통한다는 보증이 아닙니다. 잘 통하던 전략이 몇 년씩 시장에 뒤처지는 구간이 실제로 있습니다.',
  },
  {
    title: '싼 데는 이유가 있다',
    body: '적자가 이어지거나 상장폐지 위험이 있는 회사도 숫자만 보면 기준을 통과합니다. 그래서 발굴 결과에는 상장폐지 위험도와 거래 상태를 함께 붙여 둡니다.',
  },
  {
    title: '재무제표는 늦게 온다',
    body: '분기 보고서는 분기가 끝나고 한참 뒤에 나옵니다. 어제 나빠진 회사가 오늘 기준을 통과할 수 있다는 뜻입니다.',
  },
  {
    title: '작은 회사는 사고팔기가 어렵다',
    body: '저평가 기준에는 소형주가 많이 걸립니다. 거래량이 적으면 원하는 값에 체결되지 않아, 화면의 수익률과 실제 수익률이 벌어집니다.',
  },
];

const TOOLS = [
  {
    href: '/screener?mincap=500',
    icon: Filter,
    title: '퀀트 스크리너로 오늘 걸린 종목 보기',
    body: '아홉 가지 기준을 코스피·코스닥 전 종목에 매일 적용한 결과. 가입 없이 무료입니다.',
  },
  {
    href: '/analyze',
    icon: Search,
    title: '종목 하나를 재무로 뜯어보기',
    body: 'NCAV·PBR·PER·ROE와 목표주가(DCF·RIM·그레이엄), 상장폐지 위험도까지 한 화면에서.',
  },
  {
    href: '/calculator',
    icon: Calculator,
    title: '수익·손익 계산기',
    body: '매수가와 수량을 넣어 수수료·거래세까지 반영한 실제 손익을 계산합니다.',
  },
  {
    href: '/game',
    icon: Gamepad2,
    title: '모의투자로 먼저 굴려 보기',
    body: '돈을 넣기 전에 12턴짜리 판으로 "싸게 사서 기다린다" 가 어떤 일인지 겪어 봅니다.',
  },
];

export default function QuantPage() {
  return (
    <div className="min-h-screen bg-surface-canvas dark:bg-surface-dark-canvas">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        {/* ── 머리 ── */}
        <header>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#16a34a]">
            Quant Investing
          </p>
          <h1 className="mt-3 text-[26px] sm:text-[38px] font-black leading-[1.3] text-neutral-900 dark:text-white break-keep">
            퀀트 투자란? 감이 아니라 <span className="text-[#16a34a]">숫자 규칙</span>으로 종목을 고르는 방법
          </h1>
          <p className="mt-5 text-[15px] sm:text-base leading-[1.85] text-neutral-600 dark:text-neutral-300 break-keep">
            퀀트(quant)는 정량(quantitative)의 줄임말입니다. 퀀트 투자는 <strong className="font-bold text-neutral-900 dark:text-white">
            숫자로 적을 수 있는 기준을 먼저 정하고, 그 기준을 모든 종목에 똑같이 적용해</strong> 후보를 추리는
            방법입니다. 사람이 종목을 고르면 아는 회사부터 보게 되지만, 규칙은 이름을 모르는 회사도
            똑같이 셉니다. 이 글에서는 퀀트 투자의 절차와 대표 전략의 기준식, 그리고 퀀트가 못 하는
            일까지 정리합니다.
          </p>
          <p className="mt-4 text-[13px] text-neutral-400 dark:text-neutral-500">
            읽는 데 5분 · 코스피·코스닥 기준 · 무료
          </p>
        </header>

        {/* ── 절차 ── */}
        <section className="mt-14">
          <h2 className="text-[20px] sm:text-[26px] font-black text-neutral-900 dark:text-white break-keep">
            퀀트 투자는 세 단계입니다
          </h2>
          <div className="mt-6 grid gap-3">
            {STEPS.map(s => (
              <div key={s.n} className="flex gap-4 rounded-2xl border border-neutral-200 dark:border-border-subtle-dark bg-white dark:bg-surface-dark-card p-4 sm:p-5">
                <span className="shrink-0 w-7 h-7 rounded-full bg-[#dcfce7] dark:bg-[#052e16]/60 text-[#16a34a] grid place-items-center text-[13px] font-black">
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
            아래 기준식은 IdiotQuant 스크리너가 <strong className="font-bold text-neutral-900 dark:text-white">실제로 쓰는 그 조건</strong>입니다.
            같은 기준을 매일 아침 코스피·코스닥 전 종목에 적용합니다.
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
                <p className="mt-1 font-mono text-[12.5px] text-[#16a34a] break-all">{s.formula}</p>
                <p className="mt-2 text-[13px] leading-[1.75] text-neutral-600 dark:text-neutral-300 break-keep">
                  {s.plain}
                </p>
              </li>
            ))}
          </ul>

          <Link
            href="/screener?mincap=500"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#16a34a] hover:bg-[#15803d] px-5 py-3 text-[14px] font-bold text-white transition-colors"
          >
            오늘 이 기준에 걸린 종목 보기
            <ArrowRight size={15} />
          </Link>
        </section>

        {/* ── 한계 ── */}
        <section className="mt-14">
          <h2 className="text-[20px] sm:text-[26px] font-black text-neutral-900 dark:text-white break-keep">
            퀀트 투자가 못 하는 일
          </h2>
          <p className="mt-3 text-[14px] leading-[1.85] text-neutral-600 dark:text-neutral-300 break-keep">
            규칙이 사람보다 나은 것은 <strong className="font-bold text-neutral-900 dark:text-white">한결같다</strong>는 점뿐입니다.
            다음 네 가지는 규칙으로 해결되지 않으니, 스크리너 결과를 매수 목록이 아니라 조사 목록으로 보세요.
          </p>
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
            퀀트 투자, 무료로 시작하는 법
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {TOOLS.map(t => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className="group rounded-2xl border border-neutral-200 dark:border-border-subtle-dark bg-white dark:bg-surface-dark-card p-4 sm:p-5 hover:border-[#16a34a]/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Icon size={15} className="text-[#16a34a] shrink-0" />
                    <h3 className="text-[14.5px] font-black text-neutral-900 dark:text-white break-keep">{t.title}</h3>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-[1.8] text-neutral-600 dark:text-neutral-300 break-keep">{t.body}</p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── FAQ ── 검색 결과에 그대로 펼쳐지는 자리(FAQPage JSON-LD)와 같은 문장이다 */}
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
          본 페이지는 투자 참고 목적의 정보이며 특정 종목의 매수·매도를 권유하지 않습니다.
          투자 판단과 그 결과는 투자자 본인에게 있습니다.
        </p>
      </article>
    </div>
  );
}
