// 도감 — 카드와 유물, 그리고 판을 지배하는 몇 가지 수.
//
// **여기에 값을 다시 적지 않는다.** 목록도 설명도 전부 lib/game/core 에서 그대로
// 읽어 온다. 화면용 사본을 두면 카드 하나를 손볼 때 반드시 한쪽만 바뀌고, 그때부터
// 도감은 거짓말을 하기 시작한다.
//
// 캔버스가 아니라 평범한 서버 컴포넌트다 — Phaser 를 안 부르므로 정적으로 렌더된다.

import type { Metadata } from "next";
import Link from "next/link";

import {
    CARD_LIST, RELIC_POOL, REWARD_TURNS, HAND_SIZE, OFFER_SIZE,
    MAX_LEVEL, MERGE_COUNT, OPENING_DECK_SIZE,
} from "@/lib/game/core/RoguelikeManager";
import { MAX_TIER, MAX_TURNS, RUIN_LINE, SEED_CASH, TIER_IP_STEP } from "@/lib/game/core/StockEngine";
import { UNLOCKS } from "@/lib/game/core/progress";

export const metadata: Metadata = {
    title: "카드 도감 - 주식 로그라이크",
    description:
        "12턴 주식 로그라이크의 전략 카드·저주·유물 전체 목록과, 각 카드를 언제 쓰는지. 자금 이월·자본잠식·카드 합성 규칙도 함께 정리했습니다.",
    alternates: { canonical: "https://idiotquant.com/game/cards" },
};

/* ── 조각 ───────────────────────────────────────────────────── */

/** 갈래 — 무엇을 하는 카드인가. 캔버스의 손패 색(theme.LANE)과 같은 뜻이다. */
const LANE_STYLE = {
    info: { label: "정보", ring: "border-[#5cf08f]", ink: "text-[#5cf08f]" },
    act: { label: "집행", ring: "border-[#e3b34a]", ink: "text-[#e3b34a]" },
    guard: { label: "방어", ring: "border-[#6fb6ff]", ink: "text-[#6fb6ff]" },
    curse: { label: "저주", ring: "border-[#ff5ec8]", ink: "text-[#ff5ec8]" },
} as const;

/** 이 id 가 경력 몇에서 열리는가. 처음부터 있는 것은 null. */
function unlockAt(id: string): number | null {
    return UNLOCKS.find(u => u.id === id)?.at ?? null;
}

function LockTag({ id }: { id: string }) {
    const at = unlockAt(id);
    if (at === null) return null;
    return (
        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-[#e3b34a] ring-1 ring-[#e3b34a]">
            경력 {at} 에 열림
        </span>
    );
}

/**
 * 강화 단계 전부. **도감이 코어의 `levels` 를 그대로 편다.**
 *
 * 이 목록이 있어야 "0강을 27장 모으면 3강" 이 그냥 규칙이 아니라 **볼 수 있는 것**이
 * 된다 — 무엇을 향해 모으는지가 안 보이면 합성은 모아 놓고 놀라는 일일 뿐이다.
 */
function LevelTable({ card }: { card: (typeof CARD_LIST)[number] }) {
    if (card.levels.length < 2) {
        return (
            <p className="mt-2 text-[13px] leading-relaxed text-[#9aada6]">
                <span className="text-[#ff5ec8]">저주 </span>
                강화되지 않습니다. {MERGE_COUNT}장이 모이면 덱에서 사라집니다.
            </p>
        );
    }
    return (
        <div className="mt-3 border-t border-[#2f4046] pt-3">
            <p className="text-[12px] text-[#e3b34a]">
                강화 — 같은 카드 {MERGE_COUNT}장이 한 단계
            </p>
            <ul className="mt-2 space-y-1.5">
                {card.levels.map((lv, i) => (
                    <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
                        <span
                            className={`mt-0.5 h-fit shrink-0 rounded px-1.5 text-[11px] font-bold ${
                                i === 0
                                    ? "text-[#9aada6] ring-1 ring-[#2f4046]"
                                    : "bg-[#e3b34a] text-[#0b0f10]"
                            }`}
                        >
                            {i === 0 ? "맨것" : `+${i}`}
                        </span>
                        <span className="text-[#e9f2ea]">{lv.effect}</span>
                    </li>
                ))}
            </ul>
            <p className="mt-2 text-[12px] text-[#9aada6]">
                +3 한 장은 맨 카드 {MERGE_COUNT ** MAX_LEVEL}장입니다.
            </p>
        </div>
    );
}

/**
 * 카드 한 장 — **접힌 채로 온다.**
 *
 * 열두 장을 전부 펼쳐 두면 한 화면에 두 장 반이 들어가고, 무엇이 있는지 훑으려면
 * 스크롤을 열 번 굴려야 한다. 게임 안의 손패와 같은 순서로 읽히게 한다:
 * 이름 + 한 줄 요약 → 누르면 효과·언제·합성.
 *
 * `<details>` 를 쓰는 이유는 하나다 — 이 페이지가 서버 컴포넌트다. 펼침을 상태로 들면
 * 도감 전체가 클라이언트 번들로 내려가는데, 얻는 것이 여닫기 하나뿐이다.
 */
function Card({ card }: { card: (typeof CARD_LIST)[number] }) {
    const skin = LANE_STYLE[card.lane];
    return (
        <li className={`rounded-xl border bg-[#141c1e] ${skin.ring}`}>
            <details className="group">
                {/* summary 의 기본 삼각형을 지운다 — 갈래 뱃지와 나란히 서면 무엇이 표시인지
                    헷갈린다. 여닫힘은 오른쪽 끝의 +/− 하나로만 말한다. */}
                <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
                    {/* 뱃지가 셋까지 붙는다(갈래·해금·저주). 감싸지 않으면 이름이 한 글자씩
                        세로로 접혀 읽을 수 없게 된다 — 신용 융자가 실제로 그랬다. */}
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <h3 className={`mr-auto text-[15px] font-bold ${skin.ink}`}>{card.name}</h3>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ring-1 ${skin.ink} ring-current`}>
                            {skin.label}
                        </span>
                        <LockTag id={card.id} />
                        {card.curse && (
                            <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-[#ff5ec8] ring-1 ring-[#ff5ec8]">
                                저주가 딸려 옵니다
                            </span>
                        )}
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        {/* 접힌 동안 보이는 것은 손패에 붙는 그 한 줄이다. */}
                        <p className="mr-auto text-[13px] text-[#9aada6]">{card.levels[0]!.short}</p>
                        <span className="shrink-0 text-[13px] text-[#e3b34a] group-open:hidden">＋ 자세히</span>
                        <span className="hidden shrink-0 text-[13px] text-[#9aada6] group-open:inline">− 접기</span>
                    </div>
                </summary>
                <div className="border-t border-[#2f4046] px-4 pb-4 pt-3">
                    <p className="text-[13px] leading-relaxed text-[#9aada6]">
                        <span className="text-[#e3b34a]">언제 </span>
                        {card.when}
                    </p>
                    <LevelTable card={card} />
                </div>
            </details>
        </li>
    );
}

function Section({ title, note, children }: {
    title: string; note: string; children: React.ReactNode;
}) {
    return (
        <section className="mt-10">
            <h2 className="text-[13px] font-bold tracking-[0.12em] text-[#5cf08f]">{title}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[#9aada6]">{note}</p>
            {/* items-start — 한 장을 펼쳐도 옆 칸이 같이 늘어나지 않게. */}
            <ul className="mt-4 grid items-start gap-3 sm:grid-cols-2">{children}</ul>
        </section>
    );
}

/* ── 페이지 ─────────────────────────────────────────────────── */

export default function CardsPage() {
    const byKind = (k: (typeof CARD_LIST)[number]["kind"]) => CARD_LIST.filter(c => c.kind === k);
    const man = (v: number) => `${Math.round(v / 10_000).toLocaleString()}만`;
    const starters = byKind("starter").map(c => c.name).join(" · ");

    return (
        <div className="min-h-screen bg-[#0b0f10] font-[family-name:var(--font-plex-mono)]">
            <div className="mx-auto max-w-3xl px-4 py-8">
                <header>
                    <p className="text-[11px] tracking-[0.2em] text-[#e3b34a]">CODEX</p>
                    <h1 className="mt-1 text-[24px] font-bold text-[#e9f2ea]">카드 도감</h1>
                    <p className="mt-2 text-[13px] leading-relaxed text-[#9aada6]">
                        한 판은 {MAX_TURNS}턴입니다. 매 턴 덱에서 {HAND_SIZE}장을 뽑아{" "}
                        <span className="text-[#e9f2ea]">한 장만</span> 쓰고, 셋 다 버린 더미로 갑니다.
                        덱이 마르면 버린 더미를 섞어 다시 덱이 됩니다. 손패의 카드는 한 줄 요약만
                        보이고, <span className="text-[#e9f2ea]">누르면 자세한 설명</span>이 펼쳐지며
                        한 번 더 누르면 씁니다. 아래 목록도 같습니다 — 접힌 줄을 누르면 효과와
                        합성이 펼쳐집니다.
                    </p>
                    <div className="mt-4 rounded-xl border border-[#5cf08f] bg-[#141c1e] p-4">
                        <h2 className="text-[13px] font-bold tracking-[0.12em] text-[#5cf08f]">
                            한 턴에 하는 일
                        </h2>
                        <p className="mt-2 text-[13px] leading-relaxed text-[#e9f2ea]">
                            <span className="text-[#5cf08f]">읽고</span> →{" "}
                            <span className="text-[#5cf08f]">얼마나 걸지 정하고</span> →{" "}
                            <span className="text-[#5cf08f]">막습니다.</span>
                        </p>
                        <p className="mt-2 text-[13px] leading-relaxed text-[#9aada6]">
                            시장에는 <span className="text-[#e9f2ea]">숨은 국면</span>이 있습니다.
                            상승·하락·횡보가 몇 턴씩 이어지다 바뀝니다. 그래서 차트의 지난 봉이
                            다음 봉을 짐작하게 해 주고, 하락 국면에 들고 있으면 진짜로 청산됩니다 —
                            현금이 정답인 순간이 있습니다.
                        </p>
                        <p className="mt-2 text-[13px] leading-relaxed text-[#9aada6]">
                            <span className="text-[#e3b34a]">카드는 주가를 밀지 않습니다.</span>{" "}
                            바꾸는 것은 시장이 아니라 나입니다 — 무엇을 볼 수 있는가(정보),
                            무엇을 할 수 있는가(집행), 얼마나 맞을 것인가(방어).
                        </p>
                    </div>
                    <Link
                        href="/game"
                        className="mt-4 inline-block rounded-lg border border-[#5cf08f] px-3 py-1.5 text-[12px] text-[#5cf08f]"
                    >
                        게임으로 →
                    </Link>
                </header>

                {/* ── 판을 지배하는 수 ── */}
                <section className="mt-8 rounded-xl border border-[#2f4046] bg-[#141c1e] p-4">
                    <h2 className="text-[13px] font-bold tracking-[0.12em] text-[#5cf08f]">기본 규칙</h2>
                    <dl className="mt-3 grid gap-3 text-[13px] sm:grid-cols-2">
                        <div>
                            <dt className="text-[#9aada6]">시작 자금</dt>
                            <dd className="text-[#e9f2ea]">
                                {man(SEED_CASH)}
                                <span className="text-[#9aada6]"> · 다음 판은 이번 판의 최종 자산으로</span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[#9aada6]">자본잠식 (게임 오버)</dt>
                            <dd className="text-[#ff6b4a]">
                                {man(RUIN_LINE)} 미만
                                <span className="text-[#9aada6]">
                                    {" "}— 아래로 떨어지면 {MAX_TURNS}턴을 못 채우고 끝
                                </span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[#9aada6]">카드 지속</dt>
                            <dd className="text-[#e9f2ea]">
                                쓴 턴 하나
                                <span className="text-[#9aada6]"> · 예보만 본 턴 수만큼 이어집니다</span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[#9aada6]">카드 획득</dt>
                            <dd className="text-[#e9f2ea]">
                                {REWARD_TURNS.join("·")}턴을 끝냈을 때 {OFFER_SIZE}장 중 하나를 덱에
                                <span className="text-[#9aada6]"> (건너뛸 수 있음)</span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[#9aada6]">강화</dt>
                            <dd className="text-[#e9f2ea]">
                                같은 카드 {MERGE_COUNT}장 → 한 단계 위로 (최대 +{MAX_LEVEL})
                                <span className="text-[#9aada6]">
                                    {" "}· 셋째 장이 될 카드는 보상 칸에 금색으로 표시됩니다
                                    · 강화한 카드는 손패에 금색 +N 딱지가 붙습니다
                                    · 저주는 강화되지 않고 {MERGE_COUNT}장이 모이면 사라집니다
                                </span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[#9aada6]">유물</dt>
                            <dd className="text-[#e9f2ea]">
                                카드를 고른 <span className="text-[#e9f2ea]">바로 다음</span>에{" "}
                                {OFFER_SIZE}개 중 하나
                                <span className="text-[#9aada6]"> · 판 끝까지 남습니다</span>
                            </dd>
                        </div>
                    </dl>
                </section>

                {/* ── 판을 넘어 남는 것 ── */}
                <section className="mt-4 rounded-xl border border-[#e3b34a] bg-[#141c1e] p-4">
                    <h2 className="text-[13px] font-bold tracking-[0.12em] text-[#e3b34a]">
                        판을 넘어 남는 것
                    </h2>
                    <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-[#e9f2ea]">
                        <li>
                            <span className="text-[#e3b34a]">자금</span> — 판이 끝나면 그 판의 최종
                            자산이 다음 판의 시작 자금이 됩니다. 판은 끝이 아니라{" "}
                            <span className="text-[#e9f2ea]">장이 넘어가는 자리</span>입니다.
                        </li>
                        <li>
                            <span className="text-[#e3b34a]">덱</span> — 카드도 그대로 넘어갑니다.
                            아주 처음에만 기본 카드 중 무작위 {OPENING_DECK_SIZE}장으로 열고, 그 뒤로는
                            {REWARD_TURNS.join("·")}턴마다 한 장씩 늘어납니다.
                            <span className="text-[#9aada6]"> 같은 카드 {MERGE_COUNT}장이 모이면
                                한 단계 위 한 장이 되어, 덱이 두꺼워지는 것을 막으면서 세집니다.</span>
                        </li>
                        <li>
                            <span className="text-[#e3b34a]">인사이트</span> — 판마다 쌓입니다. 15당
                            시작 유물이 하나씩 늘어납니다(최대 {RELIC_POOL.length}개).
                        </li>
                        <li>
                            <span className="text-[#e3b34a]">경력 인사이트</span> — 판마다 번 것이
                            그대로 더해집니다. <span className="text-[#e9f2ea]">쓰지도 잃지도 않는
                            유일한 값</span>이라, 자본잠식돼도 이것만은 오릅니다. 카드와 유물이 여기서
                            열립니다:{" "}
                            {UNLOCKS.map(u => `${u.at}`).join(" · ")}.
                        </li>
                        <li>
                            <span className="text-[#e3b34a]">차수</span> — 완주하면 +1 (최대 {MAX_TIER}).
                            차수가 오르면 국면이 짧아지고 뉴스가 잦아져 읽기 어려워지는 대신,
                            인사이트를 {Math.round(TIER_IP_STEP * 100)}%씩 더 줍니다.
                            <span className="text-[#9aada6]"> 한 주도 안 산 판은 차수가 안 오릅니다.</span>
                        </li>
                    </ul>
                    <p className="mt-3 border-t border-[#2f4046] pt-3 text-[13px] leading-relaxed text-[#ff5ec8]">
                        자금이 {man(RUIN_LINE)} 아래로 떨어지면 자본잠식 — 거기서 게임이 끝납니다.
                        자금·덱·차수·인사이트가 전부 처음으로 돌아갑니다.{" "}
                        <span className="text-[#9aada6]">경력 인사이트만은 안 깎입니다.</span>
                    </p>
                </section>

                <Section
                    title="기본 카드"
                    note={`아주 처음에는 이 넷 중 무작위 ${OPENING_DECK_SIZE}장으로 시작합니다 (${starters}). 무엇이 빠졌는지가 그 판의 성격이 되고, 그 빈자리를 ${REWARD_TURNS.join("·")}턴의 보상으로 메웁니다. 저주가 안 딸려 오고, 모으면 ${MAX_LEVEL}강까지 오릅니다.`}
                >
                    {byKind("starter").map(c => <Card key={c.id} card={c} />)}
                </Section>

                <Section
                    title="보상 카드"
                    note={`기본 카드보다 세고, 이것들도 ${MAX_LEVEL}강까지 갑니다. 내부자 제보와 신용 융자에는 저주가 딸려 와 덱이 그만큼 더러워집니다 — 지금 센 것을 집을지, 덱을 얇게 두고 모으던 것을 마저 모을지가 매번의 선택입니다.`}
                >
                    {byKind("reward").map(c => <Card key={c.id} card={c} />)}
                </Section>

                <Section
                    title="저주"
                    note="고를 수 없습니다. 센 보상 카드에 딸려 와 덱에 섞이고, 손에 잡히면 그 턴을 버리게 만듭니다. 유물 파쇄기만이 이것을 덱 밖으로 뺍니다."
                >
                    {byKind("curse").map(c => <Card key={c.id} card={c} />)}
                </Section>

                <section className="mt-10">
                    <h2 className="text-[13px] font-bold tracking-[0.12em] text-[#e3b34a]">유물</h2>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#9aada6]">
                        카드가 한 턴짜리라면 유물은 <span className="text-[#e9f2ea]">판 내내 켜져 있는 카드</span>입니다.
                        낡은 나침반은 애널리스트 리포트를, 증권가 핫라인은 예고 시황을 매 턴 공짜로 줍니다 —
                        그만큼 카드 한 장을 다른 데 쓸 수 있게 됩니다. 한 번 얻으면 그 판이 끝날 때까지 남고, 다음 판에는 인사이트가 정한
                        수만큼 새로 뽑습니다.
                    </p>
                    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                        {RELIC_POOL.map(r => (
                            <li key={r.id} className="rounded-xl border border-[#e3b34a] bg-[#141c1e] p-4">
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                    <h3 className="mr-auto text-[15px] font-bold text-[#e3b34a]">{r.name}</h3>
                                    <LockTag id={r.id} />
                                </div>
                                <p className="mt-2 text-[13px] leading-relaxed text-[#e9f2ea]">
                                    {r.description}
                                </p>
                            </li>
                        ))}
                    </ul>
                </section>

                <footer className="mt-12 border-t border-[#2f4046] pt-6 text-[12px] text-[#9aada6]">
                    <Link href="/game" className="underline">게임으로</Link>
                </footer>
            </div>
        </div>
    );
}
