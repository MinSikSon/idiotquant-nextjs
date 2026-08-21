"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown, Plus, X, Pencil, Users, Link2, Check } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { PageHeader, PAGE_ACTION_CLS } from "@/components/pageHeader";
import type { LedgerEntry, NewLedgerEntry } from "@/lib/features/ledger/ledgerAPI";
import {
    setLedgerMonth, reqGetLedger, reqAddLedgerEntry, reqUpdateLedgerEntry, reqDeleteLedgerEntry,
    reqGetLedgerCategories, reqAddLedgerCategory, reqRenameLedgerCategory, reqDeleteLedgerCategory,
    setActiveOwner, clearLedgerInvite, reqGetLedgerAccess, reqCreateLedgerInvite,
    selectLedgerMonth, selectLedgerEntries, selectLedgerState, selectLedgerCategories,
    selectActiveOwner, selectLedgerAccess, selectLedgerMembers, selectLedgerInviteToken,
    selectLedgerMutating, selectLedgerError,
    currentMonthKst,
} from "@/lib/features/ledger/ledgerSlice";
import {
    categoriesOf, categoryLabel, catKey, type LedgerKind, type StoredCategory,
} from "@/lib/features/ledger/categories";

/* ─── 공통 클래스 ──────────────────────────────────────────────── */
const CTL_CLS =
    "w-full px-3 min-h-[44px] bg-[#faf9f7] dark:bg-[#1a1915] border border-neutral-200 dark:border-[#35332e] " +
    "rounded-xl text-sm font-bold text-neutral-900 dark:text-white " +
    "focus:outline-none focus:ring-1 focus:ring-[#16a34a] focus:border-[#16a34a]";

const FIELD_LABEL_CLS =
    "text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest";

const CARD_CLS =
    "bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] rounded-2xl";

const CHIP_CLS =
    "min-h-[40px] px-3.5 rounded-xl border text-[13px] font-bold transition-colors";

/* ─── 날짜 유틸 — 사용자가 보는 달·오늘은 KST 기준이다 ─────────── */
const todayKst = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

function shiftDay(date: string, delta: number) {
    const [y, m, d] = date.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + delta));
    return t.toISOString().slice(0, 10);
}

function shiftMonth(month: string, delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

/** 'YYYY-MM-DD' → '25일 (화)'. 요일이 있어야 "주말에 얼마 썼나"가 눈에 들어온다. */
function dayLabel(date: string) {
    const [y, m, d] = date.split("-").map(Number);
    return `${d}일 (${WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`;
}

/** epoch 초 → '8월 20일'. 워커는 UTC 로 도니 보는 사람 기준으로 9시간 당겨 읽는다. */
function stampKst(sec: number) {
    const d = new Date((sec + 9 * 60 * 60) * 1000);
    return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("ko-KR")}`;

/** 달력 칸은 50px 남짓이라 원 단위가 들어가지 않는다. 만·천으로 접는다. */
function compactWon(n: number) {
    if (n >= 10000) {
        const man = n / 10000;
        // 100만이 넘어가면 소수점이 오히려 읽기를 방해한다
        return `${man >= 100 ? Math.round(man) : Math.round(man * 10) / 10}만`;
    }
    if (n >= 1000) return `${Math.round(n / 1000)}천`;
    return String(n);
}

/** 그 달의 달력 칸. 앞뒤 빈칸은 null — 일요일 시작. */
function monthGrid(month: string): (string | null)[] {
    const [y, m] = month.split("-").map(Number);
    const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();

    const cells: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= last; d++) {
        cells.push(`${month}-${String(d).padStart(2, "0")}`);
    }
    while (cells.length % 7) cells.push(null);
    return cells;
}

/** 모바일에서 0 을 여섯 번 치는 게 가장 성가시다. 지금 값에 더한다. */
const QUICK_ADD = [10000, 50000, 100000];

/** 초대 링크. 카톡으로 그대로 붙여넣을 수 있게 절대 주소로 만든다. */
const inviteUrl = (token: string) =>
    `${typeof window === "undefined" ? "" : window.location.origin}/ledger/join/${token}`;

export default function LedgerPage() {
    const { status } = useSession();
    const dispatch = useAppDispatch();

    const month = useAppSelector(selectLedgerMonth);
    const entries = useAppSelector(selectLedgerEntries);
    const loadState = useAppSelector(selectLedgerState);
    const customCategories = useAppSelector(selectLedgerCategories);
    const activeOwner = useAppSelector(selectActiveOwner);
    const ledgers = useAppSelector(selectLedgerAccess);
    const members = useAppSelector(selectLedgerMembers);
    const inviteToken = useAppSelector(selectLedgerInviteToken);
    const mutating = useAppSelector(selectLedgerMutating);
    const error = useAppSelector(selectLedgerError);

    const [barKind, setBarKind] = useState<LedgerKind>("income");
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    /* 시트 — editingId 가 null 이면 기입, 값이 있으면 그 줄을 수정한다 */
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [askDelete, setAskDelete] = useState(false);
    const [fDate, setFDate] = useState(todayKst());
    const [fKind, setFKind] = useState<LedgerKind>("income");
    const [fCategory, setFCategory] = useState("salary");
    const [fAmount, setFAmount] = useState("");
    const [fMemo, setFMemo] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const amountRef = useRef<HTMLInputElement>(null);

    // 항목 만들기 — 시트 안에서 칩 줄 아래로 펼친다
    const [newCatOpen, setNewCatOpen] = useState(false);
    const [newCatLabel, setNewCatLabel] = useState("");
    /** null 이면 새로 만드는 중, 값이 있으면 그 항목의 이름을 고치는 중 — 입력 줄은 하나다. */
    const [catEditId, setCatEditId] = useState<number | null>(null);
    const newCatRef = useRef<HTMLInputElement>(null);

    // 시트가 목록을 가리므로 저장 결과는 시트 위에 뜨는 토스트로 알린다.
    const [toast, setToast] = useState<string | null>(null);
    const [justAddedId, setJustAddedId] = useState<number | null>(null);

    // 아래로 끌어서 닫기. 손잡이를 그려놓고 안 잡히면 잡아당겨보고 실망한다.
    const [dragY, setDragY] = useState(0);
    const dragStartRef = useRef<number | null>(null);

    const thisMonth = currentMonthKst();
    const editing = editingId !== null;
    const editingEntry = editingId === null ? null : entries.find(e => e.id === editingId) ?? null;

    /* 기록자를 보여줄 이유는 "누가 넣었지"를 물을 사람이 있을 때뿐이다.
       혼자 쓰는 가계부에서는 답이 언제나 나 하나라 줄만 늘어난다. */
    const shared = activeOwner !== null || members.length > 0;

    useEffect(() => {
        if (status !== "authenticated") return;
        dispatch(reqGetLedger(month));
    }, [dispatch, status, month, activeOwner]);

    // 항목은 월과 무관하지만 가계부마다 다르다 — 가계부가 바뀌면 다시 가져온다.
    useEffect(() => {
        if (status !== "authenticated") return;
        dispatch(reqGetLedgerCategories());
    }, [dispatch, status, activeOwner]);

    // 볼 수 있는 가계부 목록. 초대를 수락하고 돌아왔을 때도 여기서 반영된다.
    useEffect(() => {
        if (status !== "authenticated") return;
        dispatch(reqGetLedgerAccess());
    }, [dispatch, status]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 1600);
        return () => clearTimeout(t);
    }, [toast]);

    useEffect(() => {
        if (justAddedId === null) return;
        const t = setTimeout(() => setJustAddedId(null), 1600);
        return () => clearTimeout(t);
    }, [justAddedId]);

    // Esc — 삭제 확인이 떠 있으면 그것부터, 아니면 시트를 닫는다.
    useEffect(() => {
        function onKey(ev: KeyboardEvent) {
            if (ev.key !== "Escape") return;
            if (askDelete) { setAskDelete(false); return; }
            if (sheetOpen) { setSheetOpen(false); setDragY(0); dragStartRef.current = null; }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [askDelete, sheetOpen]);

    /* 요약·항목별 — 그 달 내역이 이미 전부 있으므로 여기서 한 번 접는다. */
    const { income, expense, net } = useMemo(() => {
        const income = entries.filter(e => e.kind === "income").reduce((s, e) => s + e.amount, 0);
        const expense = entries.filter(e => e.kind === "expense").reduce((s, e) => s + e.amount, 0);
        return { income, expense, net: income - expense };
    }, [entries]);

    const buckets = useMemo(() => {
        const total = barKind === "income" ? income : expense;
        if (!total) return [];
        /* 지운 항목으로 적어둔 내역도 막대에 나와야 한다 — 목록을 돌지 않고
           내역에 실제로 쓰인 키를 모아 접는다. */
        const sums = new Map<string, number>();
        for (const e of entries) {
            if (e.kind !== barKind) continue;
            sums.set(e.category, (sums.get(e.category) ?? 0) + e.amount);
        }
        return [...sums]
            .map(([key, sum]) => ({
                label: categoryLabel(barKind, key, customCategories),
                sum,
                pct: Math.round((sum / total) * 100),
            }))
            .sort((a, b) => b.sum - a.sum);
    }, [entries, barKind, income, expense]);

    /* 달력 한 칸에 얹을 그날 수입·지출. 그 달 내역이 이미 전부 있어 요청이 더 필요 없다. */
    const byDay = useMemo(() => {
        const map = new Map<string, { income: number; expense: number }>();
        for (const e of entries) {
            const cur = map.get(e.entry_date) ?? { income: 0, expense: 0 };
            cur[e.kind] += e.amount;
            map.set(e.entry_date, cur);
        }
        return map;
    }, [entries]);

    /* 날짜로 묶는다 — entries 가 이미 날짜 내림차순이라 Map 삽입 순서가 곧 표시 순서다. */
    const days = useMemo(() => {
        const map = new Map<string, LedgerEntry[]>();
        for (const e of entries) {
            const bucket = map.get(e.entry_date);
            if (bucket) bucket.push(e);
            else map.set(e.entry_date, [e]);
        }
        return [...map].map(([date, items]) => ({
            date,
            items,
            net: items.reduce((s, e) => s + (e.kind === "income" ? e.amount : -e.amount), 0),
        }));
    }, [entries]);

    /* ─── 시트 열고 닫기 ───────────────────────────────────────── */
    function changeKind(kind: LedgerKind, keep?: string) {
        setFKind(kind);
        closeCatForm();
        const list = categoriesOf(kind, customCategories);
        setFCategory(keep && list.some(c => c.key === keep) ? keep : list[0].key);
    }

    function closeCatForm() {
        setNewCatOpen(false);
        setNewCatLabel("");
        setCatEditId(null);
    }

    function openCatForm(edit?: { id: number; label: string }) {
        setCatEditId(edit?.id ?? null);
        setNewCatLabel(edit?.label ?? "");
        setNewCatOpen(true);
        setTimeout(() => newCatRef.current?.select(), 30);
    }

    /** 입력 줄 하나가 만들기와 이름 고치기를 겸한다 — 열려 있는 동안 무엇을 하는지는 catEditId 가 안다. */
    async function handleSaveCategory() {
        const label = newCatLabel.trim();
        if (!label) return;

        if (catEditId !== null) {
            const result = await dispatch(reqRenameLedgerCategory({ id: catEditId, label }));
            if (result.meta.requestStatus !== "fulfilled") return;
            // 내역은 이 항목의 id 를 가리키고 있어 목록·막대의 이름이 저절로 따라온다.
            closeCatForm();
            setToast("이름을 바꿨습니다");
            return;
        }

        const result = await dispatch(reqAddLedgerCategory({ kind: fKind, label }));
        if (result.meta.requestStatus !== "fulfilled") return;
        // 방금 만든 항목을 바로 고른 상태로 둔다 — 만들고 또 눌러야 하면 두 번 일하는 셈이다.
        const created = (result.payload as { data?: StoredCategory } | undefined)?.data;
        if (created) setFCategory(catKey(created.id));
        closeCatForm();
    }

    async function handleDeleteCategory(id: number, label: string) {
        const result = await dispatch(reqDeleteLedgerCategory({ id, label }));
        if (result.meta.requestStatus !== "fulfilled") return;
        // 고른 항목이 사라졌으면 첫 칸으로 되돌린다.
        if (fCategory === catKey(id)) setFCategory(categoriesOf(fKind, [])[0].key);
        closeCatForm();
        setToast("항목을 지웠습니다 (기록은 그대로)");
    }

    function openAdd(date?: string) {
        setEditingId(null);
        setAskDelete(false);
        setFDate(date ?? (month === thisMonth ? todayKst() : `${month}-01`));
        changeKind("income");
        setFAmount("");
        setFMemo("");
        setFormError(null);
        setSheetOpen(true);
        setTimeout(() => amountRef.current?.focus(), 60);
    }

    /* 달력에서 날짜를 누르면 — 기록이 있으면 그 줄로 데려가고, 없으면 그 날짜로 기입을 연다.
       빈 칸을 눌렀을 때 아무 일도 안 하면 달력이 읽기 전용 그림이 되어버린다. */
    function pickDay(date: string) {
        setCalendarOpen(false);
        if (byDay.has(date)) {
            requestAnimationFrame(() => {
                document.getElementById(`ledger-day-${date}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
            });
            return;
        }
        openAdd(date);
    }

    function openEdit(entry: LedgerEntry) {
        setEditingId(entry.id);
        setAskDelete(false);
        setFDate(entry.entry_date);
        changeKind(entry.kind, entry.category);
        setFAmount(entry.amount.toLocaleString("ko-KR"));
        setFMemo(entry.memo ?? "");
        setFormError(null);
        setSheetOpen(true);
    }

    const amountValue = () => Number(fAmount.replace(/[^\d]/g, ""));
    const setAmountNumber = (n: number) => setFAmount(n ? n.toLocaleString("ko-KR") : "");

    function closeSheet() {
        setSheetOpen(false);
        setDragY(0);
        dragStartRef.current = null;
    }

    /* 손잡이·제목 줄에서만 잡는다 — 본문은 스크롤 영역이라 여기서 잡으면 둘이 싸운다.
       90px 넘게 내리면 닫고, 덜 내리면 제자리로 돌아온다. */
    const CLOSE_AT = 90;

    function onDragStart(e: React.PointerEvent) {
        // 데스크톱에서는 가운데 뜨는 대화상자라 끌어내릴 이유가 없다.
        if (window.matchMedia("(min-width: 640px)").matches) return;
        dragStartRef.current = e.clientY;
        e.currentTarget.setPointerCapture(e.pointerId);
    }

    function onDragMove(e: React.PointerEvent) {
        if (dragStartRef.current === null) return;
        setDragY(Math.max(0, e.clientY - dragStartRef.current));
    }

    function onDragEnd() {
        if (dragStartRef.current === null) return;
        dragStartRef.current = null;
        if (dragY > CLOSE_AT) closeSheet();
        else setDragY(0);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const amount = amountValue();
        // "0" 은 입력값이 있는 상태라 저장 버튼이 열려 있다. 조용히 되돌아가면
        // 눌러도 아무 일이 없는 것처럼 보이므로 이유를 적어준다.
        if (!amount) {
            setFormError("금액은 0보다 커야 합니다.");
            return;
        }
        setFormError(null);

        const payload: NewLedgerEntry = {
            entry_date: fDate,
            kind: fKind,
            category: fCategory,
            amount,
            memo: fMemo.trim() || undefined,
        };
        const entered = fDate.slice(0, 7);

        if (editingId !== null) {
            // 수정은 한 건만 고치러 들어온 흐름이라 저장하면 닫는다.
            const result = await dispatch(reqUpdateLedgerEntry({ id: editingId, entry: payload }));
            if (result.meta.requestStatus !== "fulfilled") return;
            closeSheet();
            setToast("수정했습니다");
            if (entered !== month) dispatch(setLedgerMonth(entered));
            return;
        }

        const result = await dispatch(reqAddLedgerEntry(payload));
        if (result.meta.requestStatus !== "fulfilled") return;

        // 기입은 한 번에 여러 건을 넣는다. 금액·메모만 비우고 열어둔 채 금액으로 돌아간다.
        setFAmount("");
        setFMemo("");
        setJustAddedId((result.payload as { data?: { id?: number } })?.data?.id ?? null);
        setToast("저장했습니다");
        amountRef.current?.focus();

        if (entered !== month) dispatch(setLedgerMonth(entered));
    }

    async function handleDelete() {
        if (editingId === null) return;
        const result = await dispatch(reqDeleteLedgerEntry(editingId));
        if (result.meta.requestStatus !== "fulfilled") return;
        closeSheet();
        setToast("삭제했습니다");
    }

    // 미들웨어가 로그아웃 상태를 막아주지만, 보고 있는 사이 세션이 만료되면 여기로 떨어진다.
    const signedOut = status === "unauthenticated";
    const loading = status === "loading" || (loadState === "pending" && entries.length === 0);

    /* 남의 가계부를 보고 있으면 그 사실이 제목에 드러나야 한다 —
       어느 장부에 적고 있는지 모르면 잘못 적는다. */
    const activeLedger = ledgers.find(l => l.owner_user_id === activeOwner);
    const viewingShared = activeOwner !== null;

    const header = (
        <PageHeader
            emoji="📒"
            title={viewingShared ? `${activeLedger?.owner_name ?? "공유"}님의 가계부` : "가계부"}
            meta={
                viewingShared
                    ? <><span>함께 쓰는 가계부</span><span aria-hidden>·</span><span>기입·수정이 모두 반영됩니다</span></>
                    : members.length > 0
                        ? <><span>{members.length}명과 함께 쓰는 중</span><span aria-hidden>·</span><span>내 계정에 저장됩니다</span></>
                        : <><span>로그인 사용자 전용</span><span aria-hidden>·</span><span>내 계정에만 저장됩니다</span></>
            }
            containerClassName="max-w-3xl mx-auto px-4 sm:px-7"
            actions={
                <button
                    type="button"
                    onClick={() => { setShareOpen(true); setCopied(false); dispatch(clearLedgerInvite()); }}
                    className={PAGE_ACTION_CLS}
                >
                    <Users size={14} />
                    공유
                </button>
            }
        />
    );

    if (signedOut) {
        return (
            <div className="min-h-screen bg-[#faf9f7] dark:bg-[#1a1915]">
                {header}
                <div className="max-w-3xl mx-auto px-4 sm:px-7 py-5">
                    <div className={cn(CARD_CLS, "py-12 px-4 text-center")}>
                        <p className="text-[13px] font-bold text-neutral-700 dark:text-neutral-300">
                            로그인이 풀렸습니다.
                        </p>
                        <p className="mt-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                            기록은 그대로 있습니다. 다시 로그인하면 이어서 보입니다.
                        </p>
                        <Link
                            href="/login?callbackUrl=/ledger"
                            className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-black transition-colors"
                        >
                            다시 로그인
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#faf9f7] dark:bg-[#1a1915]">
            {header}

            {toast && (
                <div
                    role="status"
                    className="fixed top-[60px] md:top-5 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full bg-[#16a34a] text-white text-xs font-black shadow-lg shadow-[#16a34a]/30"
                >
                    {toast}
                </div>
            )}

            <div className="max-w-3xl mx-auto px-4 sm:px-7 py-5 space-y-3.5">

                {/* ⓪ 가계부 전환 — 볼 수 있는 가계부가 둘 이상일 때만 나온다.
                    혼자 쓰는 사람에게는 없던 UI 가 생기지 않는다. */}
                {ledgers.length > 1 && (
                    <div className={cn(CARD_CLS, "flex gap-1.5 p-1.5 overflow-x-auto")}>
                        {ledgers.map(l => {
                            const on = l.is_mine ? activeOwner === null : activeOwner === l.owner_user_id;
                            return (
                                <button
                                    key={l.owner_user_id}
                                    type="button"
                                    onClick={() => dispatch(setActiveOwner(l.is_mine ? null : l.owner_user_id))}
                                    aria-pressed={on}
                                    className={cn(
                                        "shrink-0 min-h-[40px] px-3.5 rounded-xl text-[13px] font-bold transition-colors",
                                        on
                                            ? "bg-[#16a34a] text-white"
                                            : "bg-[#faf9f7] dark:bg-[#1a1915] text-neutral-600 dark:text-neutral-400 hover:bg-[#f5f0e8] dark:hover:bg-[#2c2b27]"
                                    )}
                                >
                                    {l.is_mine ? "내 가계부" : `${l.owner_name ?? "공유"}님`}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* ① 월 선택 — 터치 타겟 44px. 달을 누르면 달력이 아래로 펼쳐진다. */}
                <div className={CARD_CLS}>
                    <div className="flex items-center justify-center gap-1 p-1.5">
                        <button
                            type="button"
                            onClick={() => dispatch(setLedgerMonth(shiftMonth(month, -1)))}
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-[#f5f0e8] dark:hover:bg-[#2c2b27] transition-colors"
                            aria-label="이전 달"
                        >
                            <ChevronLeft size={18} strokeWidth={2.4} />
                        </button>

                        <button
                            type="button"
                            onClick={() => setCalendarOpen(v => !v)}
                            aria-expanded={calendarOpen}
                            className="flex-1 sm:flex-none sm:min-w-[150px] h-11 flex items-center justify-center gap-1.5 rounded-xl text-[15px] font-black tracking-[-0.02em] text-neutral-900 dark:text-white hover:bg-[#f5f0e8] dark:hover:bg-[#2c2b27] transition-colors"
                        >
                            {Number(month.slice(0, 4))}년 {Number(month.slice(5, 7))}월
                            <ChevronDown
                                size={13} strokeWidth={2.6}
                                className={cn("text-neutral-400 transition-transform", calendarOpen && "rotate-180")}
                            />
                        </button>

                        <button
                            type="button"
                            onClick={() => dispatch(setLedgerMonth(shiftMonth(month, 1)))}
                            disabled={month >= thisMonth}
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-[#f5f0e8] dark:hover:bg-[#2c2b27] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                            aria-label="다음 달"
                        >
                            <ChevronRight size={18} strokeWidth={2.4} />
                        </button>
                    </div>

                    {calendarOpen && (
                        <div className="px-2 pb-2.5 border-t border-neutral-100 dark:border-[#35332e]">
                            <div className="grid grid-cols-7 pt-2 pb-1">
                                {WEEKDAY.map((w, i) => (
                                    <div key={w} className={cn(
                                        "text-center text-[10px] font-black",
                                        i === 0 ? "text-red-400" : i === 6 ? "text-sky-400" : "text-neutral-400"
                                    )}>
                                        {w}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-y-0.5">
                                {monthGrid(month).map((date, i) => {
                                    if (!date) return <div key={`pad-${i}`} />;
                                    const day = byDay.get(date);
                                    const isToday = date === todayKst();
                                    const future = date > todayKst();
                                    return (
                                        <button
                                            key={date}
                                            type="button"
                                            onClick={() => pickDay(date)}
                                            className={cn(
                                                "flex flex-col items-center justify-start gap-0.5 py-1 rounded-lg min-h-[44px] transition-colors",
                                                "hover:bg-[#f5f0e8] dark:hover:bg-[#2c2b27]",
                                                future && "opacity-40"
                                            )}
                                            aria-label={`${Number(date.slice(8))}일${day ? ` 지출 ${won(day.expense)}` : " 기록 없음"}`}
                                        >
                                            <span className={cn(
                                                "w-6 h-[18px] flex items-center justify-center rounded-full text-[11px] font-black tabular-nums",
                                                isToday
                                                    ? "bg-[#16a34a] text-white"
                                                    : i % 7 === 0 ? "text-red-500"
                                                        : i % 7 === 6 ? "text-sky-500"
                                                            : "text-neutral-700 dark:text-neutral-300"
                                            )}>
                                                {Number(date.slice(8))}
                                            </span>

                                            {/* '사용금액'이 먼저다. 지출이 없고 수입만 있는 날은 수입을 보여준다. */}
                                            {day && day.expense > 0 ? (
                                                <span className="text-[9px] font-black tabular-nums leading-none text-red-500 dark:text-red-400">
                                                    {compactWon(day.expense)}
                                                </span>
                                            ) : day && day.income > 0 ? (
                                                <span className="text-[9px] font-black tabular-nums leading-none text-[#16a34a]">
                                                    {compactWon(day.income)}
                                                </span>
                                            ) : (
                                                <span className="h-[9px]" />
                                            )}

                                            {/* 지출과 수입이 같은 날 있으면 점 하나로 알린다 */}
                                            <span className={cn(
                                                "w-1 h-1 rounded-full",
                                                day && day.expense > 0 && day.income > 0 ? "bg-[#16a34a]" : "bg-transparent"
                                            )} />
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-between gap-2 mt-1.5 pt-2 border-t border-neutral-100 dark:border-[#35332e]">
                                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                                    날짜를 누르면 그 날로 이동합니다
                                </span>
                                {/* 몇 해 전으로 가려고 ◀ 를 스무 번 누르게 두지 않는다 */}
                                <label className="relative shrink-0 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-[#3a3834] text-[11px] font-bold text-neutral-500 dark:text-neutral-400 cursor-pointer hover:bg-[#f5f0e8] dark:hover:bg-[#2c2b27] transition-colors">
                                    다른 달
                                    <input
                                        type="month"
                                        value={month}
                                        max={thisMonth}
                                        onChange={e => { if (e.target.value) dispatch(setLedgerMonth(e.target.value)); }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        aria-label="다른 달 선택"
                                    />
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* ② 요약 — 좁은 화면에서는 잔액을 크게 한 줄, 수입·지출은 아래 두 칸 */}
                <div className={CARD_CLS}>
                    <div className="px-4 pt-3.5 pb-3 text-center border-b border-neutral-100 dark:border-[#35332e] sm:hidden">
                        <div className={FIELD_LABEL_CLS}>잔액</div>
                        <div className={cn(
                            "mt-0.5 text-[27px] font-black tracking-[-0.03em] tabular-nums",
                            net < 0 ? "text-red-600 dark:text-red-400" : "text-[#16a34a]"
                        )}>
                            {loading ? "—" : `${net > 0 ? "+" : ""}${won(net)}`}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3">
                        <div className="py-3 px-2 text-center border-r border-neutral-100 dark:border-[#35332e]">
                            <div className={FIELD_LABEL_CLS}>수입</div>
                            <div className="mt-1 text-[15px] sm:text-[17px] font-black tracking-[-0.02em] tabular-nums text-[#16a34a]">
                                {loading ? "—" : won(income)}
                            </div>
                        </div>
                        <div className="py-3 px-2 text-center sm:border-r sm:border-neutral-100 sm:dark:border-[#35332e]">
                            <div className={FIELD_LABEL_CLS}>지출</div>
                            <div className="mt-1 text-[15px] sm:text-[17px] font-black tracking-[-0.02em] tabular-nums text-red-600 dark:text-red-400">
                                {loading ? "—" : won(expense)}
                            </div>
                        </div>
                        <div className="hidden sm:block py-3 px-2 text-center">
                            <div className={FIELD_LABEL_CLS}>잔액</div>
                            <div className={cn(
                                "mt-1 text-[17px] font-black tracking-[-0.02em] tabular-nums",
                                net < 0 ? "text-red-600 dark:text-red-400" : "text-[#16a34a]"
                            )}>
                                {loading ? "—" : `${net > 0 ? "+" : ""}${won(net)}`}
                            </div>
                        </div>
                    </div>
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
                                    aria-pressed={barKind === k}
                                    className={cn(
                                        "px-3 min-h-[34px] text-[11px] font-black transition-colors",
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

                    <div className="px-4 py-3.5 flex flex-col gap-3">
                        {buckets.length === 0 ? (
                            <div className="py-3 text-center text-xs text-neutral-400 dark:text-neutral-500">
                                이 달에 기록된 {barKind === "income" ? "수입" : "지출"}이 없습니다.
                            </div>
                        ) : buckets.map(b => (
                            /* 이름과 막대를 위아래로 — "주식 배당" 같은 긴 이름이 잘리지 않는다 */
                            <div key={b.label} className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-1">
                                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">{b.label}</span>
                                <span className="text-xs font-black tabular-nums text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                                    {b.sum.toLocaleString("ko-KR")}
                                    <span className="ml-1.5 text-[11px] font-medium text-neutral-400">{b.pct}%</span>
                                </span>
                                <span className="col-span-2 h-2 rounded-full bg-neutral-100 dark:bg-[#2c2b27] overflow-hidden">
                                    <span
                                        className={cn("block h-full rounded-full transition-all duration-300", barKind === "income" ? "bg-[#16a34a]" : "bg-red-500")}
                                        style={{ width: `${Math.max(b.pct, 2)}%` }}
                                    />
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ④ 기입 — 데스크톱은 흐름 안의 버튼, 모바일은 아래 고정 FAB */}
                <button
                    type="button"
                    onClick={() => openAdd()}
                    className="hidden sm:flex w-full items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] text-white text-[13px] font-black transition-colors"
                >
                    <Plus size={15} strokeWidth={2.6} />
                    기입하기
                </button>

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
                                <div key={i} className="h-[56px] bg-[#faf9f7] dark:bg-[#1f1e1b] animate-pulse" />
                            ))}
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="py-10 px-4 text-center text-[13px] text-neutral-400 dark:text-neutral-500">
                            <span className="block text-2xl mb-2 opacity-60" aria-hidden>📭</span>
                            이 달에는 아직 기록이 없습니다.
                            <br />“기입하기”로 첫 줄을 남겨보세요.
                        </div>
                    ) : (
                        <div>
                            {days.map(day => (
                                <div key={day.date}>
                                    <div
                                        id={`ledger-day-${day.date}`}
                                        className="flex items-baseline justify-between gap-3 px-4 py-1.5 bg-[#faf9f7] dark:bg-[#1f1e1b] border-y border-neutral-100 dark:border-[#35332e] scroll-mt-20"
                                    >
                                        <span className="text-[11px] font-black text-neutral-500 dark:text-neutral-400 tabular-nums">
                                            {dayLabel(day.date)}
                                        </span>
                                        <span className={cn(
                                            "text-[11px] font-black tabular-nums",
                                            day.net < 0 ? "text-red-600 dark:text-red-400" : "text-[#16a34a]"
                                        )}>
                                            {signed(day.net)}
                                        </span>
                                    </div>

                                    <div className="divide-y divide-neutral-50 dark:divide-[#35332e]/40">
                                        {day.items.map(e => {
                                            const isIncome = e.kind === "income";
                                            return (
                                                /* 줄 전체가 수정 진입점 — 작은 아이콘을 겨눌 필요가 없다 */
                                                <button
                                                    key={e.id}
                                                    type="button"
                                                    onClick={() => openEdit(e)}
                                                    className={cn(
                                                        "w-full grid grid-cols-[auto_1fr_auto_auto] items-center gap-2.5 px-3 sm:px-4 py-2.5 min-h-[56px] text-left transition-colors",
                                                        justAddedId === e.id
                                                            ? "bg-[#dcfce7]/70 dark:bg-[#052e16]/40"
                                                            : "hover:bg-[#f5f0e8] dark:hover:bg-[#2c2b27]"
                                                    )}
                                                    aria-label={`${e.entry_date} ${categoryLabel(e.kind, e.category, customCategories)} ${e.amount.toLocaleString("ko-KR")}원 수정`}
                                                >
                                                    <span className={cn(
                                                        "text-[11px] font-black px-2 py-0.5 rounded-md whitespace-nowrap",
                                                        isIncome
                                                            ? "bg-[#dcfce7] text-[#16a34a] dark:bg-[#052e16]/60 dark:text-[#16a34a]"
                                                            : "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                                                    )}>
                                                        {categoryLabel(e.kind, e.category, customCategories)}
                                                    </span>
                                                    <span className={cn(
                                                        "text-xs truncate",
                                                        e.memo ? "text-neutral-500 dark:text-neutral-400" : "text-neutral-300 dark:text-neutral-600 italic"
                                                    )}>
                                                        {e.memo || "메모 없음"}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[13px] font-black tabular-nums whitespace-nowrap",
                                                        isIncome ? "text-[#16a34a]" : "text-neutral-900 dark:text-neutral-100"
                                                    )}>
                                                        {isIncome ? "+" : "−"}{e.amount.toLocaleString("ko-KR")}
                                                    </span>
                                                    <ChevronRight size={15} strokeWidth={2.4} className="text-neutral-300 dark:text-neutral-600" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {loadState === "rejected" && !sheetOpen && (
                    <p className="text-center text-xs font-bold text-red-600 dark:text-red-400">
                        내역을 불러오지 못했습니다. {error}
                    </p>
                )}
            </div>

            {/* 모바일 FAB — 하단 탭바(64px) 위에 떠 있어 어디까지 스크롤해도 닿는다 */}
            {!sheetOpen && (
                <button
                    type="button"
                    onClick={() => openAdd()}
                    className="sm:hidden fixed right-4 bottom-[76px] z-40 min-h-[52px] px-5 rounded-full bg-[#16a34a] text-white text-sm font-black flex items-center gap-1.5 shadow-lg shadow-[#16a34a]/40 active:scale-95 transition-transform"
                >
                    <Plus size={18} strokeWidth={2.8} />
                    기입
                </button>
            )}

            {/* ── 공유 시트 ── */}
            {shareOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-neutral-900/45" onClick={() => setShareOpen(false)} aria-hidden />
                    <div className="relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto bg-white dark:bg-[#242320] border-t sm:border border-neutral-200 dark:border-[#35332e] rounded-t-3xl sm:rounded-2xl px-4 pt-2 pb-5 sm:pb-4 shadow-2xl">
                        <div className="sm:hidden w-9 h-1 rounded-full bg-neutral-200 dark:bg-[#35332e] mx-auto mt-1 mb-3" aria-hidden />
                        <h2 className="text-[15px] font-black tracking-[-0.02em] text-neutral-900 dark:text-white mb-1">
                            함께 쓰기
                        </h2>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                            초대한 사람은 <b className="text-neutral-700 dark:text-neutral-300">내 가계부의 모든 내역을 보고 함께 기입·수정</b>할 수 있습니다.
                        </p>

                        {/* 지금 들어와 있는 사람 */}
                        <div className="flex flex-col gap-1.5 mb-4">
                            <span className={FIELD_LABEL_CLS}>함께 쓰는 사람</span>
                            {members.length === 0 ? (
                                <p className="text-xs text-neutral-400 dark:text-neutral-500 py-1">아직 없습니다.</p>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    {members.map(m => (
                                        <div key={m.user_id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#faf9f7] dark:bg-[#1a1915]">
                                            <span className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-[#4a4641] flex items-center justify-center text-[10px] font-black text-neutral-700 dark:text-neutral-200">
                                                {m.name?.[0] ?? "?"}
                                            </span>
                                            <span className="text-[13px] font-bold text-neutral-700 dark:text-neutral-300">
                                                {m.name ?? "이름 없음"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 초대 링크 */}
                        <div className="flex flex-col gap-1.5">
                            <span className={FIELD_LABEL_CLS}>초대 링크</span>
                            {inviteToken ? (
                                <>
                                    <div className="px-3 py-2.5 rounded-xl bg-[#faf9f7] dark:bg-[#1a1915] border border-neutral-200 dark:border-[#35332e] text-[11px] font-mono break-all text-neutral-600 dark:text-neutral-400">
                                        {inviteUrl(inviteToken)}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            await navigator.clipboard?.writeText(inviteUrl(inviteToken));
                                            setCopied(true);
                                            setToast("링크를 복사했습니다");
                                        }}
                                        className="min-h-[48px] rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-black flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        {copied ? <Check size={16} strokeWidth={2.6} /> : <Link2 size={16} strokeWidth={2.4} />}
                                        {copied ? "복사했습니다" : "링크 복사"}
                                    </button>
                                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                        한 사람만 쓸 수 있고 7일 뒤 만료됩니다. 받는 분이 회원이 아니어도 링크를 열면 카카오 가입 후 바로 들어옵니다.
                                    </p>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => dispatch(reqCreateLedgerInvite())}
                                    disabled={mutating}
                                    className="min-h-[48px] rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-black flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
                                >
                                    <Link2 size={16} strokeWidth={2.4} />
                                    {mutating ? "만드는 중…" : "초대 링크 만들기"}
                                </button>
                            )}
                        </div>

                        {error && (
                            <p role="alert" className="mt-3 text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
                        )}

                        <button
                            type="button"
                            onClick={() => setShareOpen(false)}
                            className="w-full min-h-[48px] mt-3 rounded-xl border border-neutral-200 dark:border-[#3a3834] bg-[#faf9f7] dark:bg-[#1a1915] text-sm font-black text-neutral-600 dark:text-neutral-400"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}

            {/* ── 기입·수정 시트 ── */}
            {sheetOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-neutral-900/45"
                        // 끄는 만큼 뒷배경이 옅어져 "닫히는 중"이 눈에 보인다
                        style={dragY ? { opacity: Math.max(0, 1 - dragY / 260) } : undefined}
                        onClick={closeSheet}
                        aria-hidden
                    />
                    <form
                        onSubmit={handleSubmit}
                        style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
                        className="relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto bg-white dark:bg-[#242320] border-t sm:border border-neutral-200 dark:border-[#35332e] rounded-t-3xl sm:rounded-2xl px-4 pt-2 pb-5 sm:pb-4 shadow-2xl transition-transform duration-200"
                    >
                        {/* 손잡이·제목 줄이 드래그 영역 — 본문은 스크롤이라 여기서만 잡는다 */}
                        <div
                            onPointerDown={onDragStart}
                            onPointerMove={onDragMove}
                            onPointerUp={onDragEnd}
                            onPointerCancel={onDragEnd}
                            className="touch-none select-none sm:touch-auto"
                        >
                            <div className="sm:hidden w-9 h-1 rounded-full bg-neutral-200 dark:bg-[#35332e] mx-auto mt-1 mb-3" aria-hidden />

                            <div className="flex items-baseline justify-between gap-3 mb-3">
                                <h2 className="text-[15px] font-black tracking-[-0.02em] text-neutral-900 dark:text-white">
                                    {editing ? "수정하기" : "기입하기"}
                                </h2>
                                {editing && (
                                    <span className="text-[11px] text-neutral-400 tabular-nums">
                                        {fDate.replace(/-/g, ".")} 기록
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 구분 */}
                        <div className="flex flex-col gap-1.5 mb-3">
                            <span className={FIELD_LABEL_CLS}>구분</span>
                            <div className="flex rounded-xl border border-neutral-200 dark:border-[#35332e] overflow-hidden">
                                {(["income", "expense"] as LedgerKind[]).map(k => (
                                    <button
                                        key={k}
                                        type="button"
                                        onClick={() => changeKind(k, fCategory)}
                                        aria-pressed={fKind === k}
                                        className={cn(
                                            "flex-1 min-h-[46px] text-sm font-black transition-colors",
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

                        {/* 금액 — 이 화면에서 가장 자주 치는 값이라 가장 크게 */}
                        <div className="flex flex-col gap-1.5 mb-3">
                            <label htmlFor="f-amt" className={FIELD_LABEL_CLS}>금액</label>
                            <div className="flex items-baseline gap-1.5 px-3.5 py-2.5 rounded-2xl bg-[#faf9f7] dark:bg-[#1a1915] border border-neutral-200 dark:border-[#35332e] focus-within:border-[#16a34a] focus-within:ring-1 focus-within:ring-[#16a34a]">
                                <input
                                    ref={amountRef}
                                    id="f-amt" type="text" inputMode="numeric" required placeholder="0"
                                    autoComplete="off"
                                    value={fAmount}
                                    onChange={e => {
                                        const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 12);
                                        setFAmount(digits ? Number(digits).toLocaleString("ko-KR") : "");
                                        setFormError(null);
                                    }}
                                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-right text-2xl font-black tabular-nums text-neutral-900 dark:text-white placeholder:text-neutral-300 dark:placeholder:text-neutral-600"
                                />
                                <span className="text-sm font-black text-neutral-400">원</span>
                            </div>
                            <div className="flex gap-1.5">
                                {QUICK_ADD.map(v => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => { setAmountNumber(amountValue() + v); setFormError(null); }}
                                        className={cn(CHIP_CLS, "flex-1 border-neutral-200 dark:border-[#3a3834] bg-white dark:bg-[#242320] text-neutral-600 dark:text-neutral-400 hover:bg-[#f5f0e8] dark:hover:bg-[#2c2b27]")}
                                    >
                                        +{(v / 10000).toLocaleString("ko-KR")}만
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => { setFAmount(""); amountRef.current?.focus(); }}
                                    className={cn(CHIP_CLS, "w-11 px-0 border-neutral-200 dark:border-[#3a3834] bg-white dark:bg-[#242320] text-neutral-400 hover:bg-[#f5f0e8] dark:hover:bg-[#2c2b27]")}
                                    aria-label="금액 지우기"
                                >
                                    ←
                                </button>
                            </div>
                        </div>

                        {/* 항목 — 셀렉트 대신 칩. 한 번 탭으로 고른다 */}
                        <div className="flex flex-col gap-1.5 mb-3">
                            <span className={FIELD_LABEL_CLS}>항목</span>
                            <div className="flex flex-wrap gap-1.5">
                                {categoriesOf(fKind, customCategories).map(c => {
                                    const on = c.key === fCategory;
                                    const mine = c.id !== undefined;
                                    return (
                                        <span key={c.key} className="inline-flex">
                                            <button
                                                type="button"
                                                onClick={() => setFCategory(c.key)}
                                                aria-pressed={on}
                                                className={cn(
                                                    CHIP_CLS,
                                                    // 내가 만든 항목은 고른 동안만 × 가 붙으므로 오른쪽을 붙여 잇는다
                                                    on && mine && "rounded-r-none border-r-0",
                                                    on
                                                        ? fKind === "income"
                                                            ? "bg-[#16a34a] border-[#16a34a] text-white"
                                                            : "bg-red-600 border-red-600 text-white"
                                                        : "bg-[#faf9f7] dark:bg-[#1a1915] border-neutral-200 dark:border-[#35332e] text-neutral-600 dark:text-neutral-400"
                                                )}
                                            >
                                                {c.label}
                                            </button>
                                            {/* 이름 고치기·지우기는 고른 항목에만 — 칩마다 붙으면 고르다가 누른다.
                                                이름을 바꿔도 그 항목으로 적어둔 기록은 새 이름으로 함께 따라오고,
                                                지우면 항목만 사라지고 기록은 그때의 이름으로 남는다. */}
                                            {on && mine && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => openCatForm({ id: c.id!, label: c.label })}
                                                        disabled={mutating}
                                                        className={cn(
                                                            CHIP_CLS, "w-9 px-0 rounded-none border-l-0 border-r-0 flex items-center justify-center",
                                                            fKind === "income"
                                                                ? "bg-[#16a34a] border-[#16a34a] text-white/80 hover:text-white"
                                                                : "bg-red-600 border-red-600 text-white/80 hover:text-white"
                                                        )}
                                                        aria-label={`${c.label} 항목 이름 바꾸기`}
                                                    >
                                                        <Pencil size={13} strokeWidth={2.6} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteCategory(c.id!, c.label)}
                                                        disabled={mutating}
                                                        className={cn(
                                                            CHIP_CLS, "w-9 px-0 rounded-l-none border-l-0 flex items-center justify-center",
                                                            fKind === "income"
                                                                ? "bg-[#16a34a] border-[#16a34a] text-white/80 hover:text-white"
                                                                : "bg-red-600 border-red-600 text-white/80 hover:text-white"
                                                        )}
                                                        aria-label={`${c.label} 항목 지우기`}
                                                    >
                                                        <X size={14} strokeWidth={2.6} />
                                                    </button>
                                                </>
                                            )}
                                        </span>
                                    );
                                })}

                                {!newCatOpen && (
                                    <button
                                        type="button"
                                        onClick={() => openCatForm()}
                                        className={cn(CHIP_CLS, "flex items-center gap-1 border-dashed border-neutral-300 dark:border-[#4a4641] bg-transparent text-neutral-500 dark:text-neutral-400")}
                                    >
                                        <Plus size={13} strokeWidth={2.8} />
                                        항목
                                    </button>
                                )}
                            </div>

                            {newCatOpen && (
                                <div className="flex gap-1.5">
                                    <input
                                        ref={newCatRef}
                                        type="text"
                                        maxLength={12}
                                        placeholder={fKind === "income" ? "예: 부업" : "예: 여행"}
                                        value={newCatLabel}
                                        onChange={e => setNewCatLabel(e.target.value)}
                                        onKeyDown={e => {
                                            // 시트가 form 안이라 Enter 가 저장으로 새면 항목만 만들려다 기입이 된다.
                                            if (e.key === "Enter") { e.preventDefault(); handleSaveCategory(); }
                                        }}
                                        className={cn(CTL_CLS, "flex-1")}
                                        aria-label={catEditId !== null ? "항목 새 이름" : "새 항목 이름"}
                                    />
                                    <button type="button" onClick={handleSaveCategory}
                                        disabled={mutating || !newCatLabel.trim()}
                                        className="min-h-[44px] px-4 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-black disabled:opacity-50 transition-colors">
                                        {catEditId !== null ? "저장" : "추가"}
                                    </button>
                                    <button type="button" onClick={closeCatForm}
                                        className="min-h-[44px] px-3 rounded-xl border border-neutral-200 dark:border-[#3a3834] bg-[#faf9f7] dark:bg-[#1a1915] text-xs font-black text-neutral-500">
                                        취소
                                    </button>
                                </div>
                            )}
                            {catEditId !== null && (
                                <p className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500">
                                    이름만 바뀝니다 — 이 항목으로 적어둔 기록은 그대로 따라옵니다.
                                </p>
                            )}
                        </div>

                        {/* 날짜 — 대부분 오늘이라 빠른 선택을 앞에 둔다 */}
                        <div className="flex flex-col gap-1.5 mb-3">
                            <label htmlFor="f-date" className={FIELD_LABEL_CLS}>날짜</label>
                            <div className="flex gap-1.5 items-center">
                                <button type="button" onClick={() => setFDate(todayKst())}
                                    className={cn(CHIP_CLS, "border-neutral-200 dark:border-[#3a3834] bg-white dark:bg-[#242320] text-neutral-600 dark:text-neutral-400 hover:bg-[#f5f0e8] dark:hover:bg-[#2c2b27]")}>
                                    오늘
                                </button>
                                <button type="button" onClick={() => setFDate(shiftDay(todayKst(), -1))}
                                    className={cn(CHIP_CLS, "border-neutral-200 dark:border-[#3a3834] bg-white dark:bg-[#242320] text-neutral-600 dark:text-neutral-400 hover:bg-[#f5f0e8] dark:hover:bg-[#2c2b27]")}>
                                    어제
                                </button>
                                <input id="f-date" type="date" required value={fDate}
                                    onChange={e => setFDate(e.target.value)}
                                    className={cn(CTL_CLS, "flex-1 tabular-nums")} />
                            </div>
                        </div>

                        {/* 메모 */}
                        <div className="flex flex-col gap-1.5 mb-3">
                            <label htmlFor="f-memo" className={FIELD_LABEL_CLS}>메모 (선택)</label>
                            <input id="f-memo" type="text" maxLength={40} placeholder="예: 삼성전자 반기 배당"
                                value={fMemo} onChange={e => setFMemo(e.target.value)} className={CTL_CLS} />
                        </div>

                        {/* 누가 적었고 누가 고쳤는가 — 함께 쓰는 가계부에서만.
                            0028 이전 내역은 기록이 없어 줄 자체를 띄우지 않는다(빈칸도, 지어낸 이름도 두지 않는다). */}
                        {shared && editingEntry?.created_by && (
                            <div className="mb-3 pt-3 border-t border-neutral-100 dark:border-[#2c2b27] flex flex-col gap-0.5">
                                <p className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500">
                                    기록 {editingEntry.created_by_name ?? "알 수 없음"} · {stampKst(editingEntry.created_at)}
                                </p>
                                {/* 고친 적이 없으면 기록 줄과 같은 말이 된다 — 달라졌을 때만 보탠다. */}
                                {editingEntry.updated_at != null && editingEntry.updated_at !== editingEntry.created_at && (
                                    <p className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500">
                                        수정 {editingEntry.updated_by_name ?? "알 수 없음"} · {stampKst(editingEntry.updated_at)}
                                    </p>
                                )}
                            </div>
                        )}

                        {(formError ?? error) && (
                            <p role="alert" className="mb-3 text-xs font-bold text-red-600 dark:text-red-400">
                                {formError ?? error}
                            </p>
                        )}

                        {/* 추가와 수정은 다른 일이라 버튼도 다르다 */}
                        {editing && askDelete ? (
                            <div className="flex items-center gap-2">
                                <span className="flex-1 text-xs font-bold text-red-600 dark:text-red-400">
                                    삭제할까요? 되돌릴 수 없습니다.
                                </span>
                                <button type="button" onClick={() => setAskDelete(false)}
                                    className="min-h-[50px] px-4 rounded-xl border border-neutral-200 dark:border-[#3a3834] bg-[#faf9f7] dark:bg-[#1a1915] text-sm font-black text-neutral-600 dark:text-neutral-400">
                                    취소
                                </button>
                                <button type="button" onClick={handleDelete} disabled={mutating}
                                    className="min-h-[50px] px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-black disabled:opacity-50 transition-colors">
                                    {mutating ? "삭제 중…" : "삭제"}
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                {editing && (
                                    <button type="button" onClick={() => setAskDelete(true)}
                                        className="min-h-[50px] px-4 rounded-xl border border-red-600/60 text-red-600 dark:text-red-400 text-sm font-black hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                                        삭제
                                    </button>
                                )}
                                <button type="button" onClick={closeSheet}
                                    className="min-h-[50px] px-4 rounded-xl border border-neutral-200 dark:border-[#3a3834] bg-[#faf9f7] dark:bg-[#1a1915] text-sm font-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-[#2c2b27] transition-colors">
                                    {editing ? "취소" : "닫기"}
                                </button>
                                <button type="submit" disabled={mutating || !fAmount}
                                    className="flex-1 min-h-[50px] rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-[15px] font-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    {mutating ? "저장 중…" : editing ? "수정" : "저장"}
                                </button>
                            </div>
                        )}

                        {!editing && (
                            <p className="mt-2.5 text-[11px] text-neutral-400 dark:text-neutral-500 text-center">
                                저장해도 시트는 열려 있습니다 — 이어서 기입하세요.
                            </p>
                        )}
                    </form>
                </div>
            )}
        </div>
    );
}
