"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Trash2, Undo2 } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    reqGetCalculatorRuns, reqAddCalculatorRun, reqDeleteCalculatorRun,
    selectCalculatorRuns, selectCalculatorSaving, selectCalculatorError,
} from "@/lib/features/calculator/calculatorSlice";
import type { CalculatorRun } from "@/lib/features/calculator/calculatorAPI";
import type { Detail } from "./calc";

function cn(...inputs: (string | boolean | undefined | null)[]) {
    return inputs.filter(Boolean).join(" ");
}

const DETAIL_LABEL: Record<Detail, string> = { simple: "간단", detailed: "상세" };

/** epoch 초 → '8월 21일 14:03'. 워커는 UTC 로 도니 보는 사람 기준으로 당겨 읽는다. */
function stampKst(sec: number) {
    const d = new Date((sec + 9 * 60 * 60) * 1000);
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${hh}:${mm}`;
}

/** 만원 단위 → '12억 3,400만원'. 계산기 본문의 표기와 같은 규칙이다. */
function formatMan(valueInMan: number) {
    if (!valueInMan || isNaN(valueInMan)) return "0원";
    const sign = valueInMan < 0 ? "-" : "";
    const abs = Math.abs(valueInMan);
    const eok = Math.floor(abs / 10000);
    const man = Math.floor(abs % 10000);
    const parts = [eok > 0 && `${eok.toLocaleString()}억`, man > 0 && `${man.toLocaleString()}만`].filter(Boolean);
    return `${sign}${parts.join(" ") || "0"}원`;
}

interface Props {
    detail: Detail;
    /** 지금 화면의 입력값과 결과 — 저장 버튼이 그대로 실어 보낸다. */
    snapshot: () => {
        inputs: Record<string, unknown>;
        finalValue: number;
        finalRate: number;
        totalInvestment: number;
    };
    /** 불러오기 — 저장해둔 입력값과 단계를 화면에 되돌린다. */
    onLoad: (inputs: Record<string, unknown>, detail: Detail) => void;
}

/**
 * 저장해둔 계산.
 *
 * 계산기 자체는 로그인 없이 쓰는 화면이라, 이 칸만 로그인한 사람에게 열린다.
 * 안 열린 사람에게도 무엇이 있는지는 보여준다 — 없는 척하면 기능이 있는 줄도 모른다.
 */
export default function CalculatorHistory({ detail, snapshot, onLoad }: Props) {
    const { status } = useSession();
    const dispatch = useAppDispatch();

    const runs = useAppSelector(selectCalculatorRuns);
    const saving = useAppSelector(selectCalculatorSaving);
    const error = useAppSelector(selectCalculatorError);

    const [label, setLabel] = useState("");
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (status === "authenticated") dispatch(reqGetCalculatorRuns());
    }, [dispatch, status]);

    async function handleSave() {
        const { inputs, finalValue, finalRate, totalInvestment } = snapshot();
        const result = await dispatch(reqAddCalculatorRun({
            label: label.trim(), mode: detail, inputs, finalValue, finalRate, totalInvestment,
        }));
        if (result.meta.requestStatus !== "fulfilled") return;
        setLabel("");
        setOpen(true);
    }

    function handleLoad(run: CalculatorRun) {
        try {
            onLoad(JSON.parse(run.inputs), run.mode);
        } catch {
            // 저장된 JSON 이 깨졌다면 되돌릴 방법이 없다. 조용히 넘기지 않고 지우게 둔다.
        }
    }

    const shell = (children: React.ReactNode) => (
        <div>
            {children}
        </div>
    );

    if (status === "loading") {
        return shell(<div className="h-9 bg-[#f2efe9] dark:bg-surface-dark rounded-xl animate-pulse" />);
    }

    if (status !== "authenticated") {
        return shell(
            <>
                <p className="text-[11px] sm:text-xs font-semibold text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    로그인하면 지금 조건을 이름 붙여 저장하고,
                    <br />나중에 그대로 불러와 비교할 수 있습니다.
                </p>
                <Link
                    href="/login?callbackUrl=/calculator"
                    className="inline-block mt-3 px-4 py-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-[12px] font-bold transition-all duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0"
                >
                    카카오로 로그인
                </Link>
            </>
        );
    }

    return shell(
        <>
            <div className="flex gap-1.5">
                <input
                    type="text"
                    maxLength={30}
                    placeholder="이름 (선택) — 예: 공격적 10%"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                    className="flex-1 min-w-0 bg-white dark:bg-surface-dark-card border border-neutral-200 dark:border-surface-dark-border rounded-xl px-3 py-2 text-[12px] font-bold text-neutral-900 dark:text-neutral-50 outline-none focus:ring-2 focus:ring-[#16a34a]"
                />
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-[12px] font-bold shrink-0 disabled:opacity-50 transition-all duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0"
                >
                    {saving ? "저장 중…" : "저장"}
                </button>
            </div>

            {error && (
                <p role="alert" className="mt-2 text-[11px] font-bold text-rose-600 dark:text-rose-400">{error}</p>
            )}

            {runs.length === 0 ? (
                <p className="mt-3 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                    아직 저장한 계산이 없습니다.
                </p>
            ) : (
                <>
                    {/* 목록이 길어지면 이 칸이 화면을 다 먹는다 — 처음엔 세 줄만 편다. */}
                    <ul className="mt-3">
                        {(open ? runs : runs.slice(0, 3)).map((run) => (
                            <li
                                key={run.id}
                                className="flex items-center gap-2 py-2 border-b border-neutral-200 dark:border-border-subtle-dark"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[12px] font-bold text-neutral-900 dark:text-neutral-50 truncate">
                                            {run.label || stampKst(run.created_at)}
                                        </span>
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-neutral-200 dark:border-surface-dark-border text-neutral-500 dark:text-neutral-400 shrink-0">
                                            {DETAIL_LABEL[run.mode] ?? run.mode}
                                        </span>
                                    </div>
                                    <span className={cn(
                                        "block text-[10px] font-bold font-[family-name:var(--font-mono)] tabular-nums mt-0.5",
                                        run.final_value < 0
                                            ? "text-[#b91c1c] dark:text-[#ef6a6a]"
                                            : "text-[#16a34a] dark:text-[#2fa85a]"
                                    )}>
                                        만기 {formatMan(run.final_value)}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleLoad(run)}
                                    className="p-1.5 rounded-lg text-neutral-500 hover:text-[#16a34a] hover:bg-white dark:hover:bg-surface-dark-card transition-colors shrink-0"
                                    aria-label={`${run.label || stampKst(run.created_at)} 불러오기`}
                                >
                                    <Undo2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => dispatch(reqDeleteCalculatorRun(run.id))}
                                    disabled={saving}
                                    className="p-1.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-rose-600 hover:bg-white dark:hover:bg-surface-dark-card transition-colors shrink-0"
                                    aria-label={`${run.label || stampKst(run.created_at)} 삭제`}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>

                    {runs.length > 3 && (
                        <button
                            type="button"
                            onClick={() => setOpen(!open)}
                            className="mt-2 text-[10px] font-black text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                        >
                            {open ? "접기" : `${runs.length - 3}개 더 보기`}
                        </button>
                    )}
                </>
            )}
        </>
    );
}
