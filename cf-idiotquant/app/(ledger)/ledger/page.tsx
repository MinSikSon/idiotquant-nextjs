"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/pageHeader";
import {
    setLedgerMonth, reqGetLedger, reqAddLedgerEntry, reqDeleteLedgerEntry,
    selectLedgerMonth, selectLedgerEntries, selectLedgerState,
    selectLedgerMutating, selectLedgerError,
    currentMonthKst,
} from "@/lib/features/ledger/ledgerSlice";
import {
    categoriesOf, categoryLabel, type LedgerKind,
} from "@/lib/features/ledger/categories";

/* ─── 공통 클래스 (ticker-map 화면과 같은 입력 모양) ────────────────── */
const CTL_CLS =
    "w-full px-3 py-2 bg-[#faf9f7] dark:bg-[#1a1915] border border-neutral-200 dark:border-[#35332e] " +
    "rounded-xl text-sm font-bold text-neutral-900 dark:text-white " +
    "focus:outline-none focus:ring-1 focus:ring-[#16a34a] focus:border-[#16a34a]";

const FIELD_LABEL_CLS =
    "text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest";

const CARD_CLS =
    "bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] rounded-2xl";

/* ─── 날짜 유틸 — 사용자가 보는 달·오늘은 KST 기준이다 ─────────────── */
const todayKst = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

function shiftMonth(month: string, delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export default function LedgerPage() {
    const { status } = useSession();
    const dispatch = useAppDispatch();

    const month = useAppSelector(selectLedgerMonth);
    const entries = useAppSelector(selectLedgerEntries);
    const loadState = useAppSelector(selectLedgerState);
    const mutating = useAppSelector(selectLedgerMutating);
    const error = useAppSelector(selectLedgerError);

    // 항목별 막대를 수입 기준으로 볼지 지출 기준으로 볼지
    const [barKind, setBarKind] = useState<LedgerKind>("income");

    // 기입 폼
    const [formOpen, setFormOpen] = useState(false);
    const [fDate, setFDate] = useState(todayKst());
    const [fKind, setFKind] = useState<LedgerKind>("income");
    const [fCategory, setFCategory] = useState("salary");
    const [fAmount, setFAmount] = useState("");
    const [fMemo, setFMemo] = useState("");

    const thisMonth = currentMonthKst();

    useEffect(() => {
        if (status !== "authenticated") return;
        dispatch(reqGetLedger(month));
    }, [dispatch, status, month]);

    /* 요약·항목별 집계 — 그 달 내역이 이미 전부 있으므로 여기서 한 번 접는다.
       슬라이스에 따로 두면 리스트와 합계가 어긋날 자리가 생긴다. */
    const { income, expense, net } = useMemo(() => {
        const income = entries.filter(e => e.kind === "income").reduce((s, e) => s + e.amount, 0);
        const expense = entries.filter(e => e.kind === "expense").reduce((s, e) => s + e.amount, 0);
        return { income, expense, net: income - expense };
    }, [entries]);

    const buckets = useMemo(() => {
        const total = barKind === "income" ? income : expense;
        if (!total) return [];
        return categoriesOf(barKind)
            .map(c => ({
                label: c.label,
                sum: entries
                    .filter(e => e.kind === barKind && e.category === c.key)
                    .reduce((s, e) => s + e.amount, 0),
            }))
            .filter(b => b.sum > 0)
            .map(b => ({ ...b, pct: Math.round((b.sum / total) * 100) }))
            .sort((a, b) => b.sum - a.sum);
    }, [entries, barKind, income, expense]);

    /* ─── 핸들러 ───────────────────────────────────────────────── */
    function changeKind(kind: LedgerKind) {
        setFKind(kind);
        setFCategory(categoriesOf(kind)[0].key);
    }

    function openForm() {
        setFDate(month === thisMonth ? todayKst() : `${month}-01`);
        changeKind("income");
        setFAmount("");
        setFMemo("");
        setFormOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const amount = Number(fAmount.replace(/[^\d]/g, ""));
        if (!amount) return;

        const result = await dispatch(reqAddLedgerEntry({
            entry_date: fDate,
            kind: fKind,
            category: fCategory,
            amount,
            memo: fMemo.trim() || undefined,
        }));
        if (result.meta.requestStatus !== "fulfilled") return;

        setFormOpen(false);
        // 보고 있지 않은 달에 넣었으면 그 달로 따라간다 — 방금 적은 줄이 어디 갔는지 찾게 두지 않는다.
        const entered = fDate.slice(0, 7);
        if (entered !== month) dispatch(setLedgerMonth(entered));
    }

    const loading = status === "loading" || (loadState === "pending" && entries.length === 0);

    return (
        <div className="min-h-screen bg-[#faf9f7] dark:bg-[#1a1915]">
            <PageHeader
                emoji="📒"
                title="가계부"
                meta={<><span>로그인 사용자 전용</span><span aria-hidden>·</span><span>내 계정에만 저장됩니다</span></>}
                containerClassName="max-w-3xl mx-auto px-4 sm:px-7"
            />

            <div className="max-w-3xl mx-auto px-4 sm:px-7 py-5 space-y-3.5">

                {/* ① 월 선택 */}
                <div className={cn(CARD_CLS, "flex items-center justify-center gap-1.5 p-2.5")}>
                    <button
                        type="button"
                        onClick={() => dispatch(setLedgerMonth(shiftMonth(month, -1)))}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-[#f5f0e8] dark:hover:bg-[#2c2b27] transition-colors"
                        aria-label="이전 달"
                    >
                        <ChevronLeft size={17} strokeWidth={2.4} />
                    </button>
                    <div className="min-w-[132px] text-center text-[15px] font-black tracking-[-0.02em] text-neutral-900 dark:text-white">
                        {Number(month.slice(0, 4))}년 {Number(month.slice(5, 7))}월
                    </div>
                    <button
                        type="button"
                        onClick={() => dispatch(setLedgerMonth(shiftMonth(month, 1)))}
                        disabled={month >= thisMonth}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-[#f5f0e8] dark:hover:bg-[#2c2b27] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                        aria-label="다음 달"
                    >
                        <ChevronRight size={17} strokeWidth={2.4} />
                    </button>
                </div>

                {/* ② 요약 */}
                <div className={cn(CARD_CLS, "grid grid-cols-3")}>
                    {[
                        { k: "수입", v: won(income), cls: "text-[#16a34a]" },
                        { k: "지출", v: won(expense), cls: "text-red-600 dark:text-red-400" },
                        { k: "잔액", v: `${net > 0 ? "+" : ""}${won(net)}`, cls: net < 0 ? "text-red-600 dark:text-red-400" : "text-[#16a34a]" },
                    ].map((cell, i) => (
                        <div key={cell.k} className={cn("py-3.5 px-2 text-center", i < 2 && "border-r border-neutral-100 dark:border-[#35332e]")}>
                            <div className={FIELD_LABEL_CLS}>{cell.k}</div>
                            <div className={cn("mt-1 text-[17px] font-black tracking-[-0.02em] tabular-nums", cell.cls)}>
                                {loading ? "—" : cell.v}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ③ 항목별 막대 */}
                <section className={CARD_CLS}>
                    <div className="flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-neutral-100 dark:border-[#35332e]">
                        <h2 className={FIELD_LABEL_CLS}>항목별</h2>
                        <div className="flex rounded-[10px] border border-neutral-200 dark:border-[#35332e] overflow-hidden">
                            {(["income", "expense"] as LedgerKind[]).map(k => (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => setBarKind(k)}
                                    className={cn(
                                        "px-3 py-1.5 text-[11px] font-black transition-colors",
                                        barKind === k
                                            ? k === "income" ? "bg-[#16a34a] text-white" : "bg-red-600 text-white"
                                            : "bg-white dark:bg-[#242320] text-neutral-500 hover:bg-neutral-50 dark:hover:bg-[#35332e]"
                                    )}
                                >
                                    {k === "income" ? "수입" : "지출"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="px-4 py-3.5 flex flex-col gap-2.5">
                        {buckets.length === 0 ? (
                            <div className="py-3 text-center text-xs text-neutral-400 dark:text-neutral-500">
                                이 달에 기록된 {barKind === "income" ? "수입" : "지출"}이 없습니다.
                            </div>
                        ) : buckets.map(b => (
                            <div key={b.label} className="grid grid-cols-[64px_1fr_auto] items-center gap-2.5">
                                <div className="text-xs font-bold text-neutral-600 dark:text-neutral-400 truncate">{b.label}</div>
                                <div className="h-2 rounded-full bg-neutral-100 dark:bg-[#2c2b27] overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-full transition-all duration-300", barKind === "income" ? "bg-[#16a34a]" : "bg-red-500")}
                                        style={{ width: `${Math.max(b.pct, 2)}%` }}
                                    />
                                </div>
                                <div className="text-xs font-black tabular-nums text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                                    {b.sum.toLocaleString("ko-KR")}
                                    <span className="ml-1.5 text-[11px] font-medium text-neutral-400">{b.pct}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ④ 기입 */}
                {!formOpen ? (
                    <button
                        type="button"
                        onClick={openForm}
                        className="w-full flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] text-white text-[13px] font-black transition-colors"
                    >
                        <Plus size={15} strokeWidth={2.6} />
                        기입하기
                    </button>
                ) : (
                    <form onSubmit={handleSubmit} className={cn(CARD_CLS, "p-4 flex flex-col gap-3")}>
                        <div className="flex gap-2.5 flex-wrap">
                            <div className="flex flex-col gap-1.5 basis-[150px] grow-0">
                                <label htmlFor="f-date" className={FIELD_LABEL_CLS}>날짜</label>
                                <input id="f-date" type="date" required value={fDate}
                                    onChange={e => setFDate(e.target.value)} className={CTL_CLS} />
                            </div>
                            <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                                <span className={FIELD_LABEL_CLS}>구분</span>
                                <div className="flex rounded-xl border border-neutral-200 dark:border-[#35332e] overflow-hidden">
                                    {(["income", "expense"] as LedgerKind[]).map(k => (
                                        <button
                                            key={k}
                                            type="button"
                                            onClick={() => changeKind(k)}
                                            className={cn(
                                                "flex-1 py-2 text-xs font-black transition-colors",
                                                fKind === k
                                                    ? k === "income" ? "bg-[#16a34a] text-white" : "bg-red-600 text-white"
                                                    : "bg-[#faf9f7] dark:bg-[#1a1915] text-neutral-500"
                                            )}
                                        >
                                            {k === "income" ? "수입" : "지출"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2.5 flex-wrap">
                            <div className="flex flex-col gap-1.5 flex-1 min-w-[130px]">
                                <label htmlFor="f-cat" className={FIELD_LABEL_CLS}>항목</label>
                                <select id="f-cat" value={fCategory} onChange={e => setFCategory(e.target.value)} className={CTL_CLS}>
                                    {categoriesOf(fKind).map(c => (
                                        <option key={c.key} value={c.key}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5 flex-1 min-w-[130px]">
                                <label htmlFor="f-amt" className={FIELD_LABEL_CLS}>금액 (원)</label>
                                <input
                                    id="f-amt" type="text" inputMode="numeric" required placeholder="0"
                                    value={fAmount}
                                    onChange={e => {
                                        const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 12);
                                        setFAmount(digits ? Number(digits).toLocaleString("ko-KR") : "");
                                    }}
                                    className={cn(CTL_CLS, "text-right tabular-nums")}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="f-memo" className={FIELD_LABEL_CLS}>메모 (선택)</label>
                            <input id="f-memo" type="text" maxLength={40} placeholder="예: 삼성전자 반기 배당"
                                value={fMemo} onChange={e => setFMemo(e.target.value)} className={CTL_CLS} />
                        </div>

                        {error && (
                            <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
                        )}

                        <div className="flex justify-end gap-2 pt-0.5">
                            <button type="button" onClick={() => setFormOpen(false)}
                                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-[#3a3834] bg-[#faf9f7] dark:bg-[#1a1915] text-xs font-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-[#2c2b27] transition-colors">
                                취소
                            </button>
                            <button type="submit" disabled={mutating || !fAmount}
                                className="px-5 py-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                {mutating ? "저장 중…" : "저장"}
                            </button>
                        </div>
                    </form>
                )}

                {/* ⑤ 내역 */}
                <section className={cn(CARD_CLS, "overflow-hidden")}>
                    <div className="flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-neutral-100 dark:border-[#35332e]">
                        <h2 className={FIELD_LABEL_CLS}>내역</h2>
                        {entries.length > 0 && (
                            <span className="text-[11px] font-bold text-neutral-400">{entries.length}건</span>
                        )}
                    </div>

                    {loading ? (
                        <div className="divide-y divide-neutral-50 dark:divide-[#35332e]/40">
                            {[0, 1, 2].map(i => (
                                <div key={i} className="h-[46px] bg-[#faf9f7] dark:bg-[#1f1e1b] animate-pulse" />
                            ))}
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="py-10 px-4 text-center text-[13px] text-neutral-400 dark:text-neutral-500">
                            <span className="block text-2xl mb-2 opacity-60" aria-hidden>📭</span>
                            이 달에는 아직 기록이 없습니다.
                            <br />위 “기입하기”로 첫 줄을 남겨보세요.
                        </div>
                    ) : (
                        <div className="divide-y divide-neutral-50 dark:divide-[#35332e]/40">
                            {entries.map(e => {
                                const isIncome = e.kind === "income";
                                return (
                                    <div key={e.id} className="group grid grid-cols-[auto_auto_1fr_auto_28px] items-center gap-2.5 px-4 py-2.5 hover:bg-[#f5f0e8] dark:hover:bg-[#2c2b27] transition-colors">
                                        <span className="hidden sm:block text-[11px] font-bold tabular-nums text-neutral-400">
                                            {e.entry_date.slice(5).replace("-", ".")}
                                        </span>
                                        <span className={cn(
                                            "text-[11px] font-black px-2 py-0.5 rounded-md whitespace-nowrap",
                                            isIncome
                                                ? "bg-[#dcfce7] text-[#16a34a] dark:bg-[#052e16]/60 dark:text-[#16a34a]"
                                                : "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                                        )}>
                                            {categoryLabel(e.kind, e.category)}
                                        </span>
                                        <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{e.memo ?? ""}</span>
                                        <span className={cn(
                                            "text-[13px] font-black tabular-nums whitespace-nowrap",
                                            isIncome ? "text-[#16a34a]" : "text-neutral-900 dark:text-neutral-100"
                                        )}>
                                            {isIncome ? "+" : "−"}{e.amount.toLocaleString("ko-KR")}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => dispatch(reqDeleteLedgerEntry(e.id))}
                                            disabled={mutating}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400 disabled:cursor-not-allowed transition-all"
                                            aria-label={`${e.entry_date} 내역 삭제`}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {loadState === "rejected" && !formOpen && (
                    <p className="text-center text-xs font-bold text-red-600 dark:text-red-400">
                        내역을 불러오지 못했습니다. {error}
                    </p>
                )}
            </div>
        </div>
    );
}
