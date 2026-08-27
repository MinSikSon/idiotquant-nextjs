"use client";

// 90년대 창 문법 한 벌.
//
// 이 화면만 쓰는 조각들이라 components/ 로 올리지 않는다 — 다른 화면은 지금의 둥근 카드
// 문법을 그대로 쓰고 있고, 여기에서만 통하는 규칙(베벨 두께 2px, 11px 격자, 스캔라인)을
// 공용 폴더에 두면 다음 사람이 잘못 집어 간다.
//
// ── 베벨 ──────────────────────────────────────────────────────────
// 이 시대의 창은 그림자가 아니라 **테두리 네 변의 명암**으로 튀어나오고 들어간다.
// box-shadow inset 두 개로 낸다: 왼·위를 밝게, 오른·아래를 어둡게 하면 솟은 것이고
// 뒤집으면 파인 것이다. 그래서 버튼을 누르면 실제로 눌린 것처럼 보인다.
//
// ── 글자 크기 ─────────────────────────────────────────────────────
// Galmuri11 은 11px 격자에 그려진 글꼴이라 11 의 배수에서 가장 또렷하다(11·22·33·44).
// 다만 한글 문장을 11px 로 두면 읽을 수가 없어서, 설명글만 13px 을 쓴다. 그 크기에서
// 격자가 아주 살짝 흐려지지만 읽히는 쪽이 낫다.

import { cn } from "@/lib/utils";

/* ── 색 ──────────────────────────────────────────────────────────
   전역 내비게이션도 같은 색을 쓴다(/game 에서는 위아래 바까지 같은 기기다).
   그래서 색만 lib/retroPalette.ts 에 두고 양쪽이 거기서 읽는다. */
export { R } from "@/lib/retroPalette";
import { R } from "@/lib/retroPalette";

/** 솟은 면. 창·버튼의 기본 상태다. */
export const OUT = `inset 2px 2px 0 ${R.hi}, inset -2px -2px 0 ${R.lo}`;
/** 파인 면. 눌린 버튼, 값이 들어가는 칸, 화면 안쪽. */
export const IN = `inset 2px 2px 0 ${R.lo}, inset -2px -2px 0 ${R.hi}`;

/** 픽셀 글꼴 + 격자가 뭉개지지 않게. 안티에일리어싱을 끄면 모서리가 딱 떨어진다. */
export const PIXEL = "font-[family-name:var(--font-pixel)] [font-smooth:never] [-webkit-font-smoothing:none]";

/* ── 창 ────────────────────────────────────────────────────────── */

/**
 * 타이틀바가 달린 창.
 *
 * `onClose` 를 준 창에만 ⊠ 를 그린다 — 목업에는 모든 창에 있지만, 눌러도 아무 일이
 * 없는 단추를 달아 두면 한 번은 반드시 눌러 보고 고장 났다고 생각한다.
 */
export function Win({
    title, right, onClose, closeLabel, children, className, bodyClass, tone = "bar",
}: {
    title: React.ReactNode;
    /** 타이틀바 오른쪽에 붙는 것 — 날짜, 진행도 같은 것. */
    right?: React.ReactNode;
    onClose?: () => void;
    closeLabel?: string;
    children?: React.ReactNode;
    className?: string;
    bodyClass?: string;
    /** neon 은 결과 화면의 머리창처럼 한 번만 쓴다. 여러 개가 빛나면 아무것도 안 빛난다. */
    tone?: "bar" | "neon";
}) {
    return (
        <div
            className={cn("relative", className)}
            style={{ background: R.face, boxShadow: OUT }}
        >
            <div
                className="flex items-center gap-2 px-2 py-1.5 m-1"
                style={{
                    background: `linear-gradient(180deg, ${R.barHi} 0%, ${R.bar} 100%)`,
                    boxShadow: `inset 1px 1px 0 rgba(255,255,255,.18), inset -1px -1px 0 rgba(0,0,0,.35)`,
                }}
            >
                <span
                    className={cn(PIXEL, "text-[11px] font-bold uppercase tracking-[0.08em] truncate")}
                    style={{ color: tone === "neon" ? R.neon : R.inkHi }}
                >
                    {title}
                </span>
                {right && (
                    <span className={cn(PIXEL, "ml-auto text-[11px] shrink-0")} style={{ color: `${R.inkHi}b3` }}>
                        {right}
                    </span>
                )}
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={closeLabel ?? "닫기"}
                        className={cn(PIXEL, right ? "ml-1" : "ml-auto", "shrink-0 w-[18px] h-[18px] grid place-items-center text-[11px] leading-none")}
                        style={{ background: R.face, boxShadow: OUT, color: R.ink }}
                    >
                        ⊠
                    </button>
                )}
            </div>
            <div className={cn("px-2 pb-2", bodyClass)}>{children}</div>
        </div>
    );
}

/** 창 안의 한 칸. 값이 들어가는 자리는 파여 있어야 "여기는 읽는 곳"으로 읽힌다. */
export function Sunken({ children, className, style }: {
    children?: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
    return (
        <div className={cn("p-2", className)} style={{ background: R.faceLo, boxShadow: IN, ...style }}>
            {children}
        </div>
    );
}

/**
 * 브라운관 안. 차트와 그래프가 여기 들어간다.
 *
 * 스캔라인은 화면 **안쪽에만** 깐다. 페이지 전체에 깔면 글자까지 줄이 가서 한글 획이
 * 끊겨 보인다 — 픽셀 글꼴은 획이 1px 이라 한 줄만 겹쳐도 사라진다.
 */
export function Crt({ children, className }: { children?: React.ReactNode; className?: string }) {
    return (
        <div className={cn("relative overflow-hidden", className)} style={{ background: R.screen, boxShadow: IN }}>
            {children}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0px, rgba(0,0,0,.28) 1px, transparent 1px, transparent 3px)" }}
            />
        </div>
    );
}

/* ── 버튼 ──────────────────────────────────────────────────────── */

const BTN_TONE: Record<string, { bg: string; fg: string }> = {
    plain: { bg: R.face, fg: R.ink },
    buy: { bg: "#e14b4b", fg: "#fff5f5" },      // 국내 증권앱 관습 — 빨강이 사기다
    sell: { bg: "#3b82f6", fg: "#f2f7ff" },     // 파랑이 팔기
    go: { bg: "#2f8f52", fg: "#f0fff5" },       // 시작 · 확인
    warn: { bg: "#8a6206", fg: "#fff8e6" },
};

/**
 * 눌리는 단추.
 *
 * `active:` 에서 베벨을 뒤집고 글자를 1px 내린다. 이 시대 UI 에서 눌림은 색이 아니라
 * 깊이로 표시됐고, 그 감각이 이 화면의 전부다.
 */
export function RetroBtn({
    children, onClick, disabled, tone = "plain", size = "md", className, type = "button",
    selected, ...rest
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    tone?: keyof typeof BTN_TONE;
    size?: "sm" | "md" | "lg";
    className?: string;
    type?: "button" | "submit";
    /** 골라 둔 항목 — 파인 상태로 유지한다. */
    selected?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick" | "disabled" | "className" | "children">) {
    const t = BTN_TONE[tone] ?? BTN_TONE.plain;
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={cn(
                PIXEL, "font-bold uppercase tracking-[0.05em] transition-none select-none",
                "disabled:opacity-45 disabled:cursor-not-allowed",
                !disabled && "active:translate-y-px",
                size === "sm" && "text-[11px] px-2 min-h-[26px]",
                size === "md" && "text-[11px] px-3 min-h-[34px]",
                size === "lg" && "text-[22px] px-5 min-h-[48px]",
                className,
            )}
            style={{ background: t.bg, color: t.fg, boxShadow: selected ? IN : OUT }}
            {...rest}
        >
            {children}
        </button>
    );
}

/* ── 눈금 ──────────────────────────────────────────────────────── */

/**
 * 목업의 슬라이더. `<input type=range>` 를 그대로 쓰되 트랙과 손잡이만 각지게 바꾼다.
 *
 * 직접 그리지 않는 이유는 키보드·보조기술이 공짜로 따라오기 때문이다. 픽셀 모양을
 * 얻자고 접근성을 버릴 자리가 아니다.
 */
export function PixelSlider({
    id, min, max, step, value, onChange, leftLabel, rightLabel, valueText, disabled,
}: {
    id: string;
    min: number; max: number; step: number; value: number;
    onChange: (v: number) => void;
    leftLabel: string; rightLabel: string;
    valueText?: string;
    disabled?: boolean;
}) {
    return (
        <div>
            <input
                id={id}
                type="range"
                min={min} max={max} step={step} value={value}
                disabled={disabled}
                onChange={(e) => onChange(Number(e.target.value))}
                aria-valuetext={valueText}
                className={cn(
                    "w-full h-[18px] appearance-none bg-transparent cursor-pointer disabled:opacity-45",
                    // 트랙 — 파인 홈
                    "[&::-webkit-slider-runnable-track]:h-[10px] [&::-webkit-slider-runnable-track]:bg-[#3f4a45]",
                    "[&::-moz-range-track]:h-[10px] [&::-moz-range-track]:bg-[#3f4a45]",
                    // 손잡이 — 솟은 네모. 베벨은 box-shadow 대신 네 변의 테두리 색으로 낸다.
                    // 가상 요소에 콤마가 든 arbitrary box-shadow 를 주면 클래스명이 깨진다.
                    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[14px] [&::-webkit-slider-thumb]:h-[18px]",
                    "[&::-webkit-slider-thumb]:-mt-[4px] [&::-webkit-slider-thumb]:bg-[#a7b2a9] [&::-webkit-slider-thumb]:rounded-none",
                    "[&::-webkit-slider-thumb]:border-t-2 [&::-webkit-slider-thumb]:border-l-2 [&::-webkit-slider-thumb]:border-t-[#d8e0d8] [&::-webkit-slider-thumb]:border-l-[#d8e0d8]",
                    "[&::-webkit-slider-thumb]:border-b-2 [&::-webkit-slider-thumb]:border-r-2 [&::-webkit-slider-thumb]:border-b-[#4e5a53] [&::-webkit-slider-thumb]:border-r-[#4e5a53]",
                    "[&::-moz-range-thumb]:w-[14px] [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:bg-[#a7b2a9]",
                    "[&::-moz-range-thumb]:border-t-2 [&::-moz-range-thumb]:border-l-2 [&::-moz-range-thumb]:border-t-[#d8e0d8] [&::-moz-range-thumb]:border-l-[#d8e0d8]",
                    "[&::-moz-range-thumb]:border-b-2 [&::-moz-range-thumb]:border-r-2 [&::-moz-range-thumb]:border-b-[#4e5a53] [&::-moz-range-thumb]:border-r-[#4e5a53]",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5cf08f]",
                )}
            />
            <div className={cn(PIXEL, "flex justify-between text-[11px] mt-0.5")} style={{ color: R.inkDim }}>
                <span>{leftLabel}</span>
                <span>{rightLabel}</span>
            </div>
        </div>
    );
}

/* ── 값 ────────────────────────────────────────────────────────── */

/** 이름과 값이 점선으로 이어진 한 줄. 결과 화면의 통계표가 전부 이 줄이다. */
export function StatLine({ label, value, tone, mono = true }: {
    label: string; value: React.ReactNode; tone?: string; mono?: boolean;
}) {
    return (
        <div className={cn(PIXEL, "flex items-baseline gap-2 text-[11px] leading-[1.9]")}>
            <span className="shrink-0" style={{ color: R.inkDim }}>{label}</span>
            <span aria-hidden className="flex-1 border-b border-dotted min-w-[8px]" style={{ borderColor: `${R.ink}45` }} />
            <span className={cn("shrink-0 font-bold", mono && "tabular-nums")} style={{ color: tone ?? R.ink }}>
                {value}
            </span>
        </div>
    );
}

/** 깜빡이는 글자 — "PRESS ANY KEY", "NEW RECORD". 한 화면에 하나만. */
export function Blink({ children, className, style }: {
    children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
    return (
        <span className={cn("retro-blink", className)} style={style}>
            {children}
        </span>
    );
}
