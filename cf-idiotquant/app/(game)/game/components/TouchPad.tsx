"use client";

/**
 * 손가락으로 하는 Rogue.
 *
 * 원작은 키보드 게임이고 `hjklyubn` 이 그 문법이다. 웹에서는 그것만으로는 폰에서 한
 * 걸음도 못 걷는다 — 그래서 **여덟 방향 판**을 세운다. 대각선을 빼지 않는 이유는
 * 대각선이 이 게임의 도망 경로라서다.
 *
 * 명령 단추는 **지금 할 수 있는 것만** 켠다. 계단 위가 아닌데 「내려간다」가 서 있으면
 * 눌러도 아무 일이 없는 단추가 되고, 그런 단추가 셋이면 화면을 안 믿게 된다.
 *
 * ── 왜 격자인가 ──────────────────────────────────────────────────────
 * 예전에는 `flex-wrap` 이었다. 글자 수가 제각각이라(「줍기」 두 자, 「지난 판들」 다섯
 * 자) 단추 너비가 다 달랐고, 그래서 **줄마다 칸 경계가 어긋나고 오른쪽 끝이 들쭉날쭉**
 * 했다. 게다가 글자 수가 바뀌면 뒤의 단추가 전부 밀려서, 「먹는다」가 어제는 둘째 칸
 * 오늘은 셋째 칸에 있었다 — 손가락이 자리를 못 외운다.
 *
 * 지금은 **모든 칸이 같은 크기인 세 칸 격자**다. 화면 너비가 칸 수를 정하게 두면
 * (`auto-fit`) 폰에서 두 칸, 데스크톱에서 열한 칸이 되어 **기기마다 자리가 달라진다**
 * — 실제로 재 보고 고쳤다. 세 칸으로 못 박으면 `Rogue.tsx` 의 목록을 세 개씩 묶어
 * 적는 것만으로 **한 줄이 곧 한 묶음**이 되고, 그 자리는 어디서나 같다.
 *
 * 판 전체에 최대 너비를 두는 것도 같은 이유다. 안 두면 넓은 화면에서 단추가 양쪽
 * 끝까지 벌어져 방향판에서 한참 떨어진다.
 *
 * ── 꾹 누르면 연타 ───────────────────────────────────────────────────
 * **키보드는 진작부터 연타였다.** 브라우저가 방향키를 눌러 두면 `keydown` 을 알아서
 * 반복해 주므로, 데스크톱에서는 복도 열 칸을 한 번 눌러 지나갔다. 폰에서는 같은 복도를
 * **열 번 두드려야** 했다 — 같은 게임인데 조작이 달랐던 것이고, 이건 새 기능이라기보다
 * 빠져 있던 자리다.
 *
 * **방향판에만 건다.** 명령 단추가 연타되면 「내려간다」를 꾹 눌러 세 층이 지나가고,
 * 「읽는다」가 주문서를 연달아 태운다 — 그쪽은 한 번이 한 번이어야 한다.
 */

import { useCallback, useEffect, useRef, type ReactNode } from "react";

/** 첫 걸음 뒤 이만큼 기다렸다가, 그 뒤로 이 간격으로 걷는다. */
export const HOLD_DELAY = 400;
export const HOLD_STEP = 120;

export interface PadAction {
    label: string;
    hint?: string;
    /** 단축키 — **넓은 화면에서만** 이름 옆에 적는다. 폰에서는 칸이 모자라고 키보드도 없다. */
    keys?: string;
    on: () => void;
    /** 못 누르는 이유. 있으면 잠긴다. */
    off?: string;
    /** 지금 서 있는 자리에서 바로 쓸 수 있는 행동. */
    hot?: boolean;
}

function Key({
    children,
    onPress,
    disabled,
    title,
    wide,
    hot,
    hold,
}: {
    children: ReactNode;
    onPress?: () => void;
    disabled?: boolean;
    title?: string;
    wide?: boolean;
    hot?: boolean;
    /** 꾹 누르면 연타되는가. 방향판만 켠다. */
    hold?: boolean;
}) {
    // 타이머 안에서 **지금의** `onPress` 를 불러야 한다. 그대로 가두면 첫 렌더의
    // 함수가 갇혀서, 겨누기로 넘어간 뒤에도 옛 동작이 계속 돈다.
    const fire = useRef(onPress);
    fire.current = onPress;

    const delay = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tick = useRef<ReturnType<typeof setInterval> | null>(null);

    const stop = useCallback(() => {
        if (delay.current) clearTimeout(delay.current);
        if (tick.current) clearInterval(tick.current);
        delay.current = null;
        tick.current = null;
    }, []);

    // 손을 못 떼는 자리가 둘 있다 — 판이 덮여 단추가 사라질 때와, 겨누기로 넘어가
    // 연타가 꺼질 때. 둘 다 안 멈추면 **손가락을 뗀 적도 없는데 계속 걷는다.**
    useEffect(() => {
        if (!hold) stop();
        return stop;
    }, [hold, stop]);

    return (
        <button
            type="button"
            title={title}
            disabled={disabled}
            onPointerDown={
                hold
                    ? (e) => {
                          // **포인터를 잡아 둔다.** 안 잡으면 손가락이 단추 밖으로
                          // 밀렸을 때 `pointerup` 이 다른 데서 터져서, 뗐는데도 계속
                          // 걷는다 — 연타에서 제일 나쁜 고장이다.
                          e.currentTarget.setPointerCapture(e.pointerId);
                          fire.current?.();
                          delay.current = setTimeout(() => {
                              tick.current = setInterval(() => fire.current?.(), HOLD_STEP);
                          }, HOLD_DELAY);
                          // **누른 뒤 초점을 놓는다.** 안 놓으면 이 단추가 브라우저의
                          // 포커스를 쥔 채로 남고, 한참 뒤에 상관없는 키(특히 Space —
                          // 아무 단추나 눌러 버린다)를 누르면 **이 단추가 조용히 다시
                          // 눌린다.** 손가락을 뗀 적도, 그 키를 원한 적도 없는데 걸음이
                          // 나간다 — 「안 누른 키가 눌린다」는 보고가 대개 이 자리다.
                          e.currentTarget.blur();
                      }
                    : undefined
            }
            onPointerUp={
                hold
                    ? (e) => {
                          stop();
                          e.currentTarget.blur();
                      }
                    : undefined
            }
            onPointerCancel={
                hold
                    ? (e) => {
                          stop();
                          e.currentTarget.blur();
                      }
                    : undefined
            }
            // 길게 누르면 뜨는 「복사·공유」 메뉴가 연타를 끊는다.
            onContextMenu={hold ? (e) => e.preventDefault() : undefined}
            onClick={(e) => {
                // 손가락·마우스로 누른 것은 `pointerdown` 에서 이미 걸었다. 여기까지
                // 오는 것은 **키보드(Enter·Space)와 보조기술**이 만든 클릭뿐이고,
                // 그것만 `detail` 이 0 이다. 안 가르면 한 번 누를 때 두 걸음 걷는다.
                if (hold && e.detail !== 0) return;
                onPress?.();
                // 여기도 같은 까닭으로 초점을 놓는다 — 방향판이 아닌 명령 단추(「줍는다」
                // 같은 한 번짜리)는 원래 연타를 안 받는데, 초점이 남아 있으면 Enter·Space를
                // **OS 가 눌러 두는 동안 계속 눌러** 같은 값을 하는 것과 똑같이 된다
                // (못 박은 규칙: 명령 단추는 한 번이 한 번이어야 한다).
                e.currentTarget.blur();
            }}
            className={[
                // 칸 크기는 격자가 정한다 — 단추는 그 칸을 꽉 채우고 글자는 가운데.
                // `touch-none` 이 없으면 꾹 누르는 동안 브라우저가 스크롤·확대로
                // 가로채 가고, 그 순간 `pointercancel` 이 떠서 연타가 끊긴다.
                "grid touch-none select-none place-items-center rounded-[3px] border border-[var(--rg-key-line)] bg-[var(--rg-hover)]",
                "font-[family-name:var(--font-plex-mono)] leading-none text-[var(--rg-text)]",
                "active:translate-y-px active:bg-[var(--rg-press)]",
                hot ? "border-[var(--rg-gold)] bg-[var(--rg-raised)] font-bold text-[var(--rg-strong)]" : "",
                "disabled:border-[var(--rg-off-line)] disabled:bg-[var(--rg-off-bg)] disabled:text-[var(--rg-off-ink)]",
                // **줄 높이가 글자 수를 따라가면 안 된다.** 안 접으면 긴 이름 하나가
                // 두 줄로 접히면서 그 줄만 키가 커지고, 격자가 다시 어긋난다.
                wide ? "h-9 w-full overflow-hidden whitespace-nowrap px-1 text-[12px]" : "h-11 w-11 text-[13px]",
            ].join(" ")}
        >
            {children}
        </button>
    );
}

/** 방향판 아홉 칸(↖ ↑ ↗ ← · → ↙ ↓ ↘ 순)에 적을 키 — 사람 하나에 한 줄. */
export interface PadKeys {
    ink?: string;
    keys: string[];
}

const DIRS: [number, number, string, string][] = [
    [-1, -1, "↖", "왼쪽 위"], [0, -1, "↑", "위"], [1, -1, "↗", "오른쪽 위"],
    [-1, 0, "←", "왼쪽"], [0, 0, "·", "제자리에서 쉰다"], [1, 0, "→", "오른쪽"],
    [-1, 1, "↙", "왼쪽 아래"], [0, 1, "↓", "아래"], [1, 1, "↘", "오른쪽 아래"],
];

export default function TouchPad({
    onMove,
    actions,
    dirKeys = [],
    hold = true,
    centerLabel = "·",
    centerHint = "제자리에서 쉰다",
    centerHot = false,
}: {
    onMove: (dx: number, dy: number) => void;
    actions: PadAction[];
    /** 넓은 화면에서만 칸 아래에 적는다. 둘이면 둘 다, 사람마다 제 색으로. */
    dirKeys?: PadKeys[];
    /**
     * 방향판을 꾹 누르면 연타되는가.
     *
     * **겨누는 중에는 꺼야 한다.** 겨누기는 한 번 고르면 끝나는 것이라, 연타되면
     * 첫 번째가 지팡이를 쏘고 **그 뒤로는 그 방향으로 걸어 들어간다.**
     */
    hold?: boolean;
    /** 장착 지팡이 단축 동작이 켜져 있을 때 가운데 칸에 표시한다. */
    centerLabel?: string;
    centerHint?: string;
    centerHot?: boolean;
}) {
    const step = (dx: number, dy: number) => () => onMove(dx, dy);
    return (
        <div className="mx-auto flex max-w-[560px] items-start gap-3 px-2 py-2">
            <div className="grid shrink-0 grid-cols-3 gap-1">
                {DIRS.map(([dx, dy, arrow, title], i) => (
                    <Key key={i} hold={hold} onPress={step(dx, dy)} title={i === 4 ? centerHint : title} hot={i === 4 && centerHot}>
                        <span className="flex flex-col items-center gap-0.5">
                            {i === 4 ? <span className="max-w-[40px] text-center text-[9px] leading-tight">{centerLabel}</span> : arrow}
                            {dirKeys.some((p) => p.keys[i]) && (
                                <span className="hidden gap-1 text-[9px] leading-none md:flex">
                                    {dirKeys.map((p, j) =>
                                        p.keys[i] ? (
                                            <span key={j} style={{ color: p.ink ?? "var(--rg-faint)" }}>
                                                {p.keys[i]}
                                            </span>
                                        ) : null,
                                    )}
                                </span>
                            )}
                        </span>
                    </Key>
                ))}
            </div>

            {/* 어느 화면에서나 세 칸 × 다섯 줄. 자리가 안 바뀌어야 손가락이 외운다. */}
            <div className="grid min-w-0 flex-1 grid-cols-3 content-start gap-1">
                {actions.map((a) => (
                    <Key key={a.label} wide hot={a.hot && !a.off} onPress={a.on} disabled={!!a.off} title={a.off ?? a.hint}>
                        <span>
                            {a.label}
                            {a.keys && (
                                <span className="ml-1.5 hidden text-[10px] text-[var(--rg-faint)] md:inline">{a.keys}</span>
                            )}
                        </span>
                    </Key>
                ))}
            </div>
        </div>
    );
}
