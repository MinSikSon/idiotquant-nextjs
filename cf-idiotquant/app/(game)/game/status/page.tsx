"use client";

// 이력 — **회귀가 지우지 못한 것을 한 페이지에.**
//
// 게임 안에서는 지금 판의 숫자만 보인다. 판이 끝나면 돈도 에너지도 고객도 1997 로 돌아가고,
// 몇 번을 돌았는지 · 얼마나 갚았는지 · 어떻게 끝났는지는 어디에도 안 남았다. 여기가
// 그것을 읽는 자리다.
//
// **도감과 다른 점이 하나 있다 — 이 페이지는 클라이언트다.** 쌓인 것은 브라우저의
// localStorage 에만 있어서 서버가 알 수 없다. 그래서 도감(`../cards`)은 "무엇이 있고
// 어떻게 얻는가" 를 서버에서 그리고, 여기는 "내가 무엇을 했는가" 를 브라우저에서 그린다.
//
// **여기 있는 숫자는 판에 아무 영향을 주지 않는다.** 능력치 판이 아니라 기록이다
// (`lib/game/core/career.ts` 머리말).

import { useEffect, useState } from "react";
import Link from "next/link";

import { loadMemory, type Memory } from "@/lib/game/core/progress";
import { hitRate, END_REASONS } from "@/lib/game/core/career";
import { SITUATIONS, SITUATION_BY_ID } from "@/lib/game/core/situations";
import { CHAPTERS } from "@/lib/game/core/chapters";
import { LOADOUT_SIZE } from "@/lib/game/core/DeckManager";
import type { EndReason } from "@/lib/game/core/types";

/** 도감과 같은 갈래 색. 값을 다시 적지 않으려고 라벨까지 여기 한 벌만 둔다. */
const LANE_INK = {
    info: "text-[#5cf08f]",
    act: "text-[#e3b34a]",
    guard: "text-[#6fb6ff]",
    curse: "text-[#ff5ec8]",
} as const;

const END_LABEL: Record<EndReason, { name: string; note: string; ink: string }> = {
    debtCleared: { name: "갚았다", note: "루프를 끊었다", ink: "text-[#5cf08f]" },
    debtRemains: { name: "아직", note: "2000년이 지나고도 빚이 남았다", ink: "text-[#e3b34a]" },
    burnout: { name: "소진", note: "버틸 힘이 다했다", ink: "text-[#ff5ec8]" },
    ruined: { name: "전부", note: "맡은 돈을 다 날렸다", ink: "text-[#ff5ec8]" },
};

/** 원 단위 그대로 적는다. 게임 화면은 폭이 없어 「3천만」으로 줄이지만 여기는 자리가 있다. */
const won = (v: number) => `${Math.round(v).toLocaleString()}원`;
const pct = (r: number | null) => (r === null ? "—" : `${Math.round(r * 100)}%`);

function Row({ k, v, ink = "text-[#d8e0d8]" }: { k: string; v: string; ink?: string }) {
    return (
        <div className="flex items-baseline justify-between gap-4 border-b border-white/5 py-2 last:border-0">
            <span className="shrink-0 text-[#6d7f78]">{k}</span>
            <span className={`text-right tabular-nums ${ink}`}>{v}</span>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="mb-8">
            <h2 className="mb-3 font-mono text-[12px] uppercase tracking-[0.2em] text-[#41686f]">{title}</h2>
            {children}
        </section>
    );
}

function Panel({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-white/10 bg-[#141c1e] px-4 py-2 font-mono text-[13px]">
            {children}
        </div>
    );
}

export default function StatusPage() {
    // 서버에는 localStorage 가 없다. 첫 그림은 서버와 같아야 하므로 읽기는 마운트 뒤로 미룬다.
    const [memory, setMemory] = useState<Memory | null>(null);
    useEffect(() => { setMemory(loadMemory()); }, []);

    return (
        <main className="mx-auto min-h-screen max-w-2xl bg-[#0b0f10] px-4 py-8 text-[#d8e0d8]">
            <header className="mb-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#41686f]">
                    IMF · 1997—2000
                </p>
                <h1 className="mt-2 font-mono text-3xl font-bold">이력</h1>
                <p className="mt-3 max-w-prose text-[14px] leading-relaxed text-[#8d9c93]">
                    판이 끝나면 돈도 에너지도 고객도 1997 로 돌아간다.
                    <b className="text-[#d8e0d8]"> 여기 있는 것만 안 돌아간다</b> — 몇 번을 돌았는지,
                    얼마나 갚았는지, 어떻게 끝났는지. 이 숫자들은 판을 유리하게 만들지 않는다.
                    지나온 것을 읽는 자리다.
                </p>
            </header>

            {memory === null ? (
                <p className="font-mono text-[13px] text-[#4e5f58]">읽는 중…</p>
            ) : (
                <Body memory={memory} />
            )}

            <nav className="flex gap-5 font-mono text-[13px]">
                <Link href="/game" className="text-[#5cf08f] underline underline-offset-4">← 게임으로</Link>
                <Link href="/game/cards" className="text-[#8d9c93] underline underline-offset-4">상황 도감</Link>
            </nav>
        </main>
    );
}

function Body({ memory }: { memory: Memory }) {
    const c = memory.career;
    const f = memory.facts;
    const total = SITUATIONS.length;
    const collected = memory.situations.filter(id => SITUATION_BY_ID[id]);
    const bestChapter = CHAPTERS[Math.min(c.chapters > 0 ? memory.bestChapter : 0, CHAPTERS.length - 1)]!;

    // 판을 한 번도 안 끝냈으면 이력은 거의 비어 있다. 0 이 줄줄이 늘어선 표보다
    // **왜 비어 있는지**를 말해 주는 편이 낫다.
    const started = c.chapters > 0 || c.runs > 0;

    return (
        <>
            <Section title="지금">
                <Panel>
                    <Row k="회차" v={`${memory.cycle}회차`} />
                    <Row k="여태 가장 멀리" v={`${bestChapter.year} ${bestChapter.title}`} />
                    <Row k="모은 상황카드" v={`${collected.length} / ${total}장`} ink="text-[#5cf08f]" />
                    <Row k="들고 나갈 것" v={`${memory.loadout.length} / ${LOADOUT_SIZE}장`} />
                    <Row
                        k="루프를 끊은 적"
                        v={memory.escaped ? "있다 — 빚을 다 갚아 봤다" : "없다"}
                        ink={memory.escaped ? "text-[#5cf08f]" : "text-[#6d7f78]"}
                    />
                    <Row
                        k="바닥을 본 적"
                        v={f.everRuined ? "있다 — 맡은 돈을 다 날려 봤다" : "없다"}
                        ink={f.everRuined ? "text-[#ff5ec8]" : "text-[#6d7f78]"}
                    />
                </Panel>
            </Section>

            {!started && (
                <p className="mb-8 rounded-xl border border-[#e3b34a]/30 bg-[#e3b34a]/5 p-4 text-[14px] leading-relaxed text-[#8d9c93]">
                    아직 챕터를 하나도 안 끝냈다. 아래 숫자는 <b className="text-[#d8e0d8]">한 챕터를
                    끝낼 때마다</b> 쌓인다 — 판을 끝까지 안 가고 창을 닫아도 남는다.
                </p>
            )}

            <Section title="빚">
                <Panel>
                    <Row k="여태 갚은 빚" v={won(c.repaid)} ink={c.repaid > 0 ? "text-[#5cf08f]" : undefined} />
                    <Row k="여태 받은 보수" v={won(c.feePaid)} />
                    <Row k="알바로 번 돈" v={won(c.wageEarned)} />
                    <Row k="가장 적게 남긴 빚" v={c.leastDebt === null ? "— 아직 판을 안 끝냈다" : won(c.leastDebt)} />
                    <Row k="끝낸 챕터" v={`${c.chapters}장`} />
                    <Row k="끝까지 간 판" v={`${c.runs}판`} />
                </Panel>
                <p className="mt-2 text-[13px] leading-relaxed text-[#6d7f78]">
                    빚을 줄이는 돈은 <b className="text-[#8d9c93]">보수</b>뿐이다. 챕터에서 늘린 만큼
                    받고, 에너지가 높을수록 많이 받는다. 보수는 지갑으로 들어오고, 갚는 것은 장부에서
                    내가 누를 때 일어난다 — 위 두 줄이 갈리는 이유다.
                    알바비는 <b className="text-[#8d9c93]">먹고사는 데</b> 쓴다.
                </p>
            </Section>

            <Section title="어떻게 끝났나">
                <ul className="space-y-2">
                    {END_REASONS.map(r => {
                        const e = END_LABEL[r];
                        const n = c.endings[r];
                        return (
                            <li
                                key={r}
                                className={`flex items-baseline gap-3 rounded-xl border bg-[#141c1e] p-4 ${
                                    n > 0 ? "border-white/15" : "border-white/5"
                                }`}
                            >
                                <span className={`text-[15px] font-bold ${n > 0 ? e.ink : "text-[#4e5f58]"}`}>
                                    {e.name}
                                </span>
                                <span className={`text-[13px] ${n > 0 ? "text-[#8d9c93]" : "text-[#3d4a45]"}`}>
                                    {e.note}
                                </span>
                                <span className={`ml-auto font-mono tabular-nums ${n > 0 ? "text-[#d8e0d8]" : "text-[#3d4a45]"}`}>
                                    {n}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </Section>

            <Section title="근거 × 결과">
                <p className="mb-3 text-[14px] leading-relaxed text-[#8d9c93]">
                    이 게임이 하는 말은 <b className="text-[#d8e0d8]">근거를 대는 편이 낫다</b>는 것이다.
                    그게 사실인지는 여기서 직접 센다.
                </p>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-left text-[13px]">
                        <thead className="bg-[#141c1e] font-mono text-[11px] uppercase tracking-wider text-[#4e5f58]">
                            <tr>
                                <th className="p-3" />
                                <th className="p-3">권했다</th>
                                <th className="p-3">잃었다</th>
                                <th className="p-3">맞은 비율</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono tabular-nums text-[#8d9c93]">
                            <tr className="border-t border-white/5">
                                <td className="p-3 text-[#d8e0d8]">근거 있음</td>
                                <td className="p-3">{c.thesisPlays}</td>
                                <td className="p-3">{c.thesisLosses}</td>
                                <td className="p-3 text-[#5cf08f]">
                                    {pct(hitRate(c.thesisPlays - c.thesisLosses, c.thesisLosses))}
                                </td>
                            </tr>
                            <tr className="border-t border-white/5">
                                <td className="p-3 text-[#d8e0d8]">근거 없음</td>
                                <td className="p-3">{c.blindGains + c.blindLosses}</td>
                                <td className="p-3">{c.blindLosses}</td>
                                <td className="p-3 text-[#ff5ec8]">{pct(hitRate(c.blindGains, c.blindLosses))}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="mt-2">
                    <Panel>
                        <Row k="손절이 걸린 횟수" v={`${c.stopHits}번`} />
                        <Row k="가장 높았던 에너지" v={c.bestEnergy > 0 ? `${c.bestEnergy}` : "—"} />
                        <Row k="가장 컸던 자산" v={c.bestEquity > 0 ? won(c.bestEquity) : "—"} />
                    </Panel>
                </div>
            </Section>

            <Section title="이번 판">
                <p className="mb-3 text-[14px] leading-relaxed text-[#8d9c93]">
                    상황카드의 조건이 읽는 값이다. <b className="text-[#d8e0d8]">판이 끝나면 비워진다</b> —
                    위의 이력은 비워지기 직전에 접어 둔 합이다.
                </p>
                <Panel>
                    <Row k="근거를 대고 권한 횟수" v={`${f.thesisPlays}번`} />
                    <Row k="근거를 대고 잃은 횟수" v={`${f.thesisLosses}번`} />
                    <Row k="감으로 벌었다 / 잃었다" v={`${f.blindGains} / ${f.blindLosses}번`} />
                    <Row k="손절" v={`${f.stopHits}번`} />
                    <Row k="이 챕터에 기다린 턴" v={`${f.waitsThisChapter}턴`} />
                    <Row k="한 턴에 맞은 최악" v={f.worstTurnPct < 0 ? `${f.worstTurnPct.toFixed(1)}%` : "—"}
                        ink={f.worstTurnPct < 0 ? "text-[#ff5ec8]" : undefined} />
                    <Row k="김 부장 연속" v={`${f.kimStreak}번`} />
                </Panel>
            </Section>

            <Section title={`겪은 장면 ${collected.length}장`}>
                <ul className="flex flex-wrap gap-2">
                    {collected.map(id => {
                        const s = SITUATION_BY_ID[id]!;
                        return (
                            <li
                                key={id}
                                className={`rounded-lg border border-white/10 bg-[#141c1e] px-3 py-1.5 text-[13px] ${LANE_INK[s.lane]}`}
                            >
                                {s.name}
                                {memory.loadout.includes(id) && (
                                    <span className="ml-1.5 text-[11px] text-[#4e5f58]">들고 나간다</span>
                                )}
                            </li>
                        );
                    })}
                </ul>
                {collected.length < total && (
                    <p className="mt-3 text-[13px] text-[#6d7f78]">
                        아직 {total - collected.length}장이 남았다. 무엇이 있고 어떻게 얻는지는{" "}
                        <Link href="/game/cards" className="text-[#8d9c93] underline underline-offset-2">
                            상황 도감
                        </Link>
                        에 있다.
                    </p>
                )}
            </Section>
        </>
    );
}
