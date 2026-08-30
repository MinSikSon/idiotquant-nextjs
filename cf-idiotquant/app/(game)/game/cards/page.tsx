// 도감 — 카드와 유물, 그리고 판을 지배하는 몇 가지 수.
//
// **여기에 값을 다시 적지 않는다.** 목록도 설명도 전부 lib/game/core 에서 그대로
// 읽어 온다. 화면용 사본을 두면 카드 하나를 손볼 때 반드시 한쪽만 바뀌고, 그때부터
// 도감은 거짓말을 하기 시작한다.
//
// 캔버스가 아니라 평범한 서버 컴포넌트다 — Phaser 를 안 부르므로 정적으로 렌더된다.

import type { Metadata } from "next";
import Link from "next/link";

import { CARD_LIST, RELIC_POOL, UPGRADE_SLOTS, UPGRADE_POOL } from "@/lib/game/core/RoguelikeManager";
import { REWARD_TURNS, HAND_SIZE, OFFER_SIZE } from "@/lib/game/core/RoguelikeManager";
import { BUST_RATIO, MAX_TIER, MAX_TURNS, START_CASH, TIER_BUST_STEP, TIER_IP_STEP } from "@/lib/game/core/StockEngine";
import { UPGRADE_COSTS } from "@/lib/game/core/progress";

export const metadata: Metadata = {
    title: "카드 도감 - 주식 로그라이크",
    description:
        "12턴 주식 로그라이크의 전략 카드·저주·유물 전체 목록과, 각 카드를 언제 쓰는지. 청산선·시작 덱 강화·차수 규칙도 함께 정리했습니다.",
    alternates: { canonical: "https://idiotquant.com/game/cards" },
};

/* ── 조각 ───────────────────────────────────────────────────── */

const KIND_STYLE = {
    starter: { label: "시작 덱", ring: "border-[#2f4046]", ink: "text-[#e9f2ea]" },
    reward: { label: "보상", ring: "border-[#5cf08f]", ink: "text-[#5cf08f]" },
    curse: { label: "저주", ring: "border-[#ff5ec8]", ink: "text-[#ff5ec8]" },
} as const;

function Card({ card }: { card: (typeof CARD_LIST)[number] }) {
    const skin = KIND_STYLE[card.kind];
    return (
        <li className={`rounded-xl border bg-[#141c1e] p-4 ${skin.ring}`}>
            <div className="flex items-baseline justify-between gap-3">
                <h3 className={`text-[15px] font-bold ${skin.ink}`}>{card.name}</h3>
                {card.curse && (
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-[#ff5ec8] ring-1 ring-[#ff5ec8]">
                        저주가 딸려 옵니다
                    </span>
                )}
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-[#e9f2ea]">{card.effectDescription}</p>
            <p className="mt-2 border-t border-[#2f4046] pt-2 text-[12px] leading-relaxed text-[#7d8f88]">
                <span className="text-[#e3b34a]">언제 </span>
                {card.when}
            </p>
        </li>
    );
}

function Section({ title, note, children }: {
    title: string; note: string; children: React.ReactNode;
}) {
    return (
        <section className="mt-10">
            <h2 className="text-[13px] font-bold tracking-[0.12em] text-[#5cf08f]">{title}</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-[#7d8f88]">{note}</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">{children}</ul>
        </section>
    );
}

/* ── 페이지 ─────────────────────────────────────────────────── */

export default function CardsPage() {
    const byKind = (k: (typeof CARD_LIST)[number]["kind"]) => CARD_LIST.filter(c => c.kind === k);
    const man = (v: number) => `${Math.round(v / 10_000).toLocaleString()}만`;
    const upgradable = UPGRADE_POOL
        .map(id => CARD_LIST.find(c => c.id === id)?.name)
        .filter(Boolean)
        .join(" · ");

    return (
        <div className="min-h-screen bg-[#0b0f10] font-[family-name:var(--font-plex-mono)]">
            <div className="mx-auto max-w-3xl px-4 py-8">
                <header>
                    <p className="text-[11px] tracking-[0.2em] text-[#e3b34a]">CODEX</p>
                    <h1 className="mt-1 text-[24px] font-bold text-[#e9f2ea]">카드 도감</h1>
                    <p className="mt-2 text-[13px] leading-relaxed text-[#7d8f88]">
                        한 판은 {MAX_TURNS}턴입니다. 매 턴 덱에서 {HAND_SIZE}장을 뽑아{" "}
                        <span className="text-[#e9f2ea]">한 장만</span> 쓰고, 셋 다 버린 더미로 갑니다.
                        덱이 마르면 버린 더미를 섞어 다시 덱이 됩니다.
                    </p>
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
                            <dt className="text-[#7d8f88]">시작 자금</dt>
                            <dd className="text-[#e9f2ea]">{man(START_CASH)}</dd>
                        </div>
                        <div>
                            <dt className="text-[#7d8f88]">청산선 (게임 오버)</dt>
                            <dd className="text-[#ff6b4a]">
                                시작 자금의 {Math.round(BUST_RATIO * 100)}%
                                <span className="text-[#7d8f88]">
                                    {" "}— 아래로 떨어지면 {MAX_TURNS}턴을 못 채우고 끝
                                </span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[#7d8f88]">카드 보상</dt>
                            <dd className="text-[#e9f2ea]">
                                {REWARD_TURNS.join("·")}턴을 끝냈을 때 {OFFER_SIZE}장 중 하나
                                <span className="text-[#7d8f88]"> (건너뛸 수 있음)</span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[#7d8f88]">유물</dt>
                            <dd className="text-[#e9f2ea]">
                                4·8턴을 끝냈을 때 {OFFER_SIZE}개 중 하나
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
                            <span className="text-[#e3b34a]">인사이트</span> — 판마다 쌓입니다. 15당
                            시작 유물이 하나씩 늘고(최대 {RELIC_POOL.length}개), 시작 덱 강화의 값으로도 씁니다.
                        </li>
                        <li>
                            <span className="text-[#e3b34a]">시작 덱 강화</span> — 판을 열기 전에 시작 덱
                            여섯 장 중 앞 {UPGRADE_SLOTS}자리를 영구히 갈아 끼웁니다. 값은{" "}
                            {UPGRADE_COSTS.join(" / ")}. 고를 수 있는 것: {upgradable}.
                            <span className="text-[#7d8f88]"> 덱 크기는 늘 6이라 원하는 카드가
                                잡히는 확률은 그대로고 질만 오릅니다.</span>
                        </li>
                        <li>
                            <span className="text-[#e3b34a]">차수</span> — 완주하면 +1, 청산되면 −1
                            (최대 {MAX_TIER}). 차수마다 청산선이 {Math.round(TIER_BUST_STEP * 100)}%p
                            올라오고 인사이트를 {Math.round(TIER_IP_STEP * 100)}% 더 줍니다.
                            <span className="text-[#7d8f88]"> 위험을 사서 성장을 앞당기는 자리입니다.</span>
                        </li>
                    </ul>
                    <p className="mt-3 border-t border-[#2f4046] pt-3 text-[12px] leading-relaxed text-[#ff5ec8]">
                        청산되면 인사이트가 절반이 되고 시작 덱 강화가 전부 사라집니다. 그 판에서 번
                        인사이트도 0입니다.
                    </p>
                </section>

                <Section
                    title="시작 덱"
                    note="여섯 장으로 시작합니다 — 관망 지시 둘, 방어막 둘, 인사이더 호재 하나, 손절 수수료 면제 하나. 약하지만 덜 다치게 하는 쪽입니다."
                >
                    {byKind("starter").map(c => <Card key={c.id} card={c} />)}
                </Section>

                <Section
                    title="보상 카드"
                    note="판을 뒤집는 카드들. 아래 둘에는 저주가 딸려 와 덱이 그만큼 더러워집니다 — 안 고르는 것이 늘 손해는 아닙니다."
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
                    <p className="mt-1 text-[12px] leading-relaxed text-[#7d8f88]">
                        카드가 한 턴짜리라면 유물은 <span className="text-[#e9f2ea]">판 전체의 기울기</span>를
                        바꿉니다. 한 번 얻으면 그 판이 끝날 때까지 남고, 다음 판에는 인사이트가 정한
                        수만큼 새로 뽑습니다.
                    </p>
                    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                        {RELIC_POOL.map(r => (
                            <li key={r.id} className="rounded-xl border border-[#e3b34a] bg-[#141c1e] p-4">
                                <h3 className="text-[15px] font-bold text-[#e3b34a]">{r.name}</h3>
                                <p className="mt-2 text-[13px] leading-relaxed text-[#e9f2ea]">
                                    {r.description}
                                </p>
                            </li>
                        ))}
                    </ul>
                </section>

                <footer className="mt-12 border-t border-[#2f4046] pt-6 text-[12px] text-[#3c4844]">
                    <Link href="/game" className="underline">게임으로</Link>
                    <span className="px-2">·</span>
                    <Link href="/game/blind" className="underline">블라인드 차트</Link>
                </footer>
            </div>
        </div>
    );
}
