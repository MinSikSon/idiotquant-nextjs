// 상황 도감 — **겪은 장면과 아직 못 겪은 장면.**
//
// **여기에 값을 다시 적지 않는다.** 목록도 조건도 설명도 전부 `lib/game/core` 에서 그대로
// 읽어 온다. 화면용 사본을 두면 카드 하나를 손볼 때 반드시 한쪽만 바뀌고, 그때부터
// 도감은 거짓말을 하기 시작한다.
//
// 무엇을 겪었는지는 브라우저(localStorage)에만 있다. 이 페이지는 서버 컴포넌트라
// 그 값을 모른다 — 그래서 **수집 현황이 아니라 조건 목록**을 보여 준다. 어차피 도감에서
// 알고 싶은 것은 "무엇이 있고 어떻게 얻는가" 이고, 몇 장 모았는지는 집 화면이 말한다.

import type { Metadata } from "next";
import Link from "next/link";

import { SITUATIONS, STARTER_IDS, countsAsThesis } from "@/lib/game/core/situations";
import { CHAPTERS, UNIVERSE, TOTAL_TURNS } from "@/lib/game/core/chapters";
import { CLIENTS } from "@/lib/game/core/clients";
import {
    ENERGY_DECAY, ENERGY_GAIN_WITH_THESIS, ENERGY_LOSS_WITH_THESIS, ENERGY_LOSS_BLIND,
    COST_BY_LANE,
} from "@/lib/game/core/energy";
import { HAND_SIZE, LOADOUT_SIZE } from "@/lib/game/core/DeckManager";
import { ENERGY_START } from "@/lib/game/core/StockEngine";

export const metadata: Metadata = {
    title: "상황 도감 · 재기",
    description: "겪어야 얻는 상황카드와 그 조건, 그리고 1997~2000 의 연대.",
};

const LANE_STYLE = {
    info: { label: "정보", ring: "border-[#5cf08f]/40", ink: "text-[#5cf08f]" },
    act: { label: "집행", ring: "border-[#e3b34a]/40", ink: "text-[#e3b34a]" },
    guard: { label: "방어", ring: "border-[#6fb6ff]/40", ink: "text-[#6fb6ff]" },
    curse: { label: "저주", ring: "border-[#ff5ec8]/40", ink: "text-[#ff5ec8]" },
} as const;

function Situation({ s }: { s: (typeof SITUATIONS)[number] }) {
    const skin = LANE_STYLE[s.lane];
    const starter = s.starter === true;
    return (
        <li className={`rounded-xl border bg-[#141c1e] ${skin.ring}`}>
            <details className="group">
                <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <h3 className={`mr-auto text-[15px] font-bold ${skin.ink}`}>{s.name}</h3>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] ${skin.ink} bg-white/5`}>
                            {skin.label}
                        </span>
                        {COST_BY_LANE[s.lane] > 0 && (
                            <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-[#e3b34a]">
                                에너지 {COST_BY_LANE[s.lane]}
                            </span>
                        )}
                        {starter && (
                            <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-[#9aada6]">
                                처음부터
                            </span>
                        )}
                        {countsAsThesis(s) && (
                            <span className="shrink-0 rounded bg-[#e3b34a]/15 px-1.5 py-0.5 text-[11px] text-[#e3b34a]">
                                근거가 된다
                            </span>
                        )}
                        <span className="ml-1 shrink-0 text-[13px] text-[#55645d] group-open:hidden">＋</span>
                        <span className="ml-1 hidden shrink-0 text-[13px] text-[#55645d] group-open:inline">−</span>
                    </div>
                    <p className="mt-1 text-[13px] text-[#8d9c93]">{s.short}</p>
                </summary>
                <div className="space-y-2 border-t border-white/5 p-4 pt-3 text-[13px] leading-relaxed">
                    <p className="text-[#c6d3cb] italic">{s.scene}</p>
                    <p className="text-[#8d9c93]">{s.effect}</p>
                    <p className="text-[#6d7f78]">
                        <span className="text-[#4e5f58]">언제 쓰나 — </span>{s.when}
                    </p>
                    <p className="text-[#e3b34a]">
                        <span className="text-[#4e5f58]">얻는 법 — </span>{s.how}
                    </p>
                </div>
            </details>
        </li>
    );
}

function Row({ k, v }: { k: string; v: string }) {
    return (
        <div className="flex justify-between border-b border-white/5 py-2">
            <span className="text-[#6d7f78]">{k}</span>
            <span className="text-[#d8e0d8]">{v}</span>
        </div>
    );
}

export default function CardsPage() {
    const starters = SITUATIONS.filter(s => s.starter);
    const earned = SITUATIONS.filter(s => !s.starter);

    return (
        <main className="mx-auto min-h-screen max-w-2xl bg-[#0b0f10] px-4 py-8 text-[#d8e0d8]">
            <header className="mb-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#41686f]">
                    재기 · 1997—2000
                </p>
                <h1 className="mt-2 font-mono text-3xl font-bold">상황 도감</h1>
                <p className="mt-3 max-w-prose text-[14px] leading-relaxed text-[#8d9c93]">
                    상황카드는 <b className="text-[#d8e0d8]">겪은 장면</b>이다. 정해진 턴에 주는 것이
                    아니라 조건을 채우면 그 자리에서 온다. 판이 끝나 1997 로 돌아가도
                    <b className="text-[#d8e0d8]"> 겪은 것은 남는다</b> — 그것이 다음 회차의 손패다.
                </p>
            </header>

            <section className="mb-8">
                <h2 className="mb-3 font-mono text-[12px] uppercase tracking-[0.2em] text-[#41686f]">
                    처음부터 갖고 있는 {starters.length}장
                </h2>
                <ul className="space-y-2">
                    {starters.map(s => <Situation key={s.id} s={s} />)}
                </ul>
            </section>

            <section className="mb-8">
                <h2 className="mb-3 font-mono text-[12px] uppercase tracking-[0.2em] text-[#41686f]">
                    겪어야 얻는 {earned.length}장
                </h2>
                <ul className="space-y-2">
                    {earned.map(s => <Situation key={s.id} s={s} />)}
                </ul>
            </section>

            <section className="mb-8">
                <h2 className="mb-3 font-mono text-[12px] uppercase tracking-[0.2em] text-[#41686f]">
                    에너지 — 게이지는 하나뿐이다
                </h2>
                <p className="mb-3 text-[14px] leading-relaxed text-[#8d9c93]">
                    <b className="text-[#d8e0d8]">버티는 힘이자 곧 목숨</b>이다. 매 턴 저절로 줄고,
                    카드를 낼 때마다 그 갈래의 값만큼 든다. 0 이 되면 그 자리에서 판이 끝난다.
                    챕터 보수도 이 값에 비례하므로 <b className="text-[#d8e0d8]">에너지가 곧 빚을
                    갚는 속도</b>이기도 하다.
                </p>
                <div className="mb-3 overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-left text-[13px]">
                        <thead className="bg-[#141c1e] font-mono text-[11px] uppercase tracking-wider text-[#4e5f58]">
                            <tr><th className="p-3">무엇을 하면</th><th className="p-3">에너지</th><th className="p-3">왜</th></tr>
                        </thead>
                        <tbody className="text-[#8d9c93]">
                            <tr className="border-t border-white/5">
                                <td className="p-3 text-[#d8e0d8]">하루가 지난다</td>
                                <td className="p-3 font-mono">−{ENERGY_DECAY}</td>
                                <td className="p-3">아무것도 안 해도 든다</td>
                            </tr>
                            {(["info", "act", "guard"] as const).map(lane => (
                                <tr key={lane} className="border-t border-white/5">
                                    <td className={`p-3 ${LANE_STYLE[lane].ink}`}>
                                        {LANE_STYLE[lane].label} 카드를 낸다
                                    </td>
                                    <td className="p-3 font-mono">−{COST_BY_LANE[lane]}</td>
                                    <td className="p-3">
                                        {lane === "info" ? "앞을 보는 일이 제일 많이 든다"
                                            : lane === "act" ? "손을 쓰는 일"
                                            : "웅크리는 데는 덜 든다"}
                                    </td>
                                </tr>
                            ))}
                            <tr className="border-t border-white/5">
                                <td className="p-3 text-[#ff5ec8]">저주 카드를 낸다</td>
                                <td className="p-3 font-mono">−{COST_BY_LANE.curse}</td>
                                <td className="p-3">이미 벌이다</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p className="mb-8 text-[13px] leading-relaxed text-[#6d7f78]">
                    아끼는 쪽이 공짜는 아니다 — 안 내고 넘긴 턴에도 빚은 이자로 늘고 {TOTAL_TURNS}턴이라는
                    시계는 계속 간다. <b className="text-[#8d9c93]">아껴 오래 버틸 것인가 써서 벌 것인가</b>가
                    이 표의 전부다.
                </p>

                <h2 className="mb-3 font-mono text-[12px] uppercase tracking-[0.2em] text-[#41686f]">
                    결과 × 근거 — 무엇이 에너지를 올리나
                </h2>
                <p className="mb-3 text-[14px] leading-relaxed text-[#8d9c93]">
                    정산은 결과가 아니라 <b className="text-[#d8e0d8]">결과 × 근거</b>로 한다.
                    <b className="text-[#d8e0d8]"> 운으로 벌어도 에너지는 오르지 않는다</b> — 회귀해서
                    미래를 알고 미리 팔아도 마찬가지다. 회귀자만 아는 미래는 설명할 수 없기 때문이다.
                </p>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-left text-[13px]">
                        <thead className="bg-[#141c1e] font-mono text-[11px] uppercase tracking-wider text-[#4e5f58]">
                            <tr><th className="p-3" /><th className="p-3">벌었다</th><th className="p-3">잃었다</th></tr>
                        </thead>
                        <tbody className="text-[#8d9c93]">
                            <tr className="border-t border-white/5">
                                <td className="p-3 text-[#d8e0d8]">근거 있음</td>
                                <td className="p-3 text-[#5cf08f]">에너지 +{ENERGY_GAIN_WITH_THESIS} × 고객</td>
                                <td className="p-3">에너지 −{ENERGY_LOSS_WITH_THESIS} × 고객</td>
                            </tr>
                            <tr className="border-t border-white/5">
                                <td className="p-3 text-[#d8e0d8]">근거 없음</td>
                                <td className="p-3">그대로</td>
                                <td className="p-3 text-[#ff5ec8]">에너지 −{ENERGY_LOSS_BLIND} × 고객</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="mb-8">
                <h2 className="mb-3 font-mono text-[12px] uppercase tracking-[0.2em] text-[#41686f]">
                    맡긴 사람들
                </h2>
                <ul className="space-y-2">
                    {CLIENTS.map(c => (
                        <li key={c.id} className="rounded-xl border border-white/10 bg-[#141c1e] p-4">
                            <h3 className="text-[15px] font-bold text-[#d8e0d8]">{c.name}</h3>
                            <p className="mt-1 text-[13px] text-[#8d9c93]">{c.blurb}</p>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="mb-8">
                <h2 className="mb-3 font-mono text-[12px] uppercase tracking-[0.2em] text-[#41686f]">
                    1997 → 2000
                </h2>
                <ul className="space-y-2">
                    {CHAPTERS.map(ch => (
                        <li key={ch.id} className="rounded-xl border border-white/10 bg-[#141c1e] p-4">
                            <div className="flex items-baseline gap-2">
                                <h3 className="font-mono text-[17px] font-bold text-[#d8e0d8]">{ch.year}</h3>
                                <span className="text-[13px] text-[#e3b34a]">{ch.title}</span>
                                <span className="ml-auto font-mono text-[11px] text-[#4e5f58]">{ch.turns}턴</span>
                            </div>
                            <p className="mt-2 text-[13px] leading-relaxed text-[#8d9c93]">
                                {ch.narration.join(" ")}
                            </p>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="mb-8">
                <h2 className="mb-3 font-mono text-[12px] uppercase tracking-[0.2em] text-[#41686f]">
                    아홉 회사 — 반기마다 하나씩
                </h2>
                <p className="mb-3 text-[14px] leading-relaxed text-[#8d9c93]">
                    전부 지어낸 회사다. 시장 국면은 하나뿐이고 종목은 각자의 <b className="text-[#d8e0d8]">β</b> 로
                    반응한다 — 같은 하락에서 방어주와 닷컴이 다섯 배로 갈린다.
                </p>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-left text-[13px]">
                        <thead className="bg-[#141c1e] font-mono text-[11px] uppercase tracking-wider text-[#4e5f58]">
                            <tr><th className="p-3">상장</th><th className="p-3">회사</th><th className="p-3">β</th><th className="p-3">어떤 회사</th></tr>
                        </thead>
                        <tbody className="text-[#8d9c93]">
                            {UNIVERSE.map(s => (
                                <tr key={s.id} className="border-t border-white/5">
                                    <td className="p-3 font-mono text-[#4e5f58]">{s.listedAt === 1 ? "시작" : `${s.listedAt}턴`}</td>
                                    <td className="p-3 text-[#d8e0d8]">{s.name}</td>
                                    <td className={`p-3 font-mono ${s.beta >= 1.5 ? "text-[#ff5ec8]" : s.beta <= 0.6 ? "text-[#6fb6ff]" : ""}`}>
                                        {s.beta.toFixed(1)}
                                    </td>
                                    <td className="p-3">{s.blurb}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="mb-10">
                <h2 className="mb-3 font-mono text-[12px] uppercase tracking-[0.2em] text-[#41686f]">
                    판을 지배하는 수
                </h2>
                <div className="rounded-xl border border-white/10 bg-[#141c1e] px-4 py-2 font-mono text-[13px]">
                    <Row k="한 챕터" v={`${CHAPTERS[1]!.turns}턴 (프롤로그만 ${CHAPTERS[0]!.turns}턴)`} />
                    <Row k="전 구간" v={`${TOTAL_TURNS}턴 · 1997~2000`} />
                    <Row k="손패" v={`${HAND_SIZE}장`} />
                    <Row k="들고 나가는 덱" v={`${LOADOUT_SIZE}장 — 집에서 고른다`} />
                    <Row k="에너지" v={`${ENERGY_START} 에서 시작 · 매 턴 −${ENERGY_DECAY} · 카드 −${COST_BY_LANE.guard}~${COST_BY_LANE.info}`} />
                    <Row k="루프를 끊는 것" v="빚 완납 하나뿐" />
                </div>
            </section>

            <nav className="flex gap-5 font-mono text-[13px]">
                <Link href="/game" className="text-[#5cf08f] underline underline-offset-4">← 게임으로</Link>
                <Link href="/game/status" className="text-[#8d9c93] underline underline-offset-4">이력</Link>
            </nav>
        </main>
    );
}
