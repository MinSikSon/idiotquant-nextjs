"use client";

/**
 * 터져도 **영영 안 열리는 일은 없게** 한다.
 *
 * 이 게임은 한 턴마다 스스로 저장한다. 그래서 규칙에 버그가 하나 생기면 이런 일이
 * 벌어진다 — 판이 터지고 → 화면이 하얘지고 → 새로고침하면 **같은 저장을 다시 읽어
 * 또 터진다.** 그 사람에게 `/game` 은 그때부터 영영 안 열리는 주소가 된다.
 *
 * 실제로 그랬다. 규칙에 함정을 더하면서 값이 하나 늘었는데, 그 전에 저장된 판에는
 * 그 칸이 없어서 한 걸음 걷는 순간 터졌다. 빈 칸 채우기는 `storage.normalize` 가
 * 고쳤지만, **다음에 또 같은 종류의 일이 날 것**이므로 빠져나갈 문을 따로 둔다.
 *
 * 이 판이 하는 일은 하나다: **저장을 지우고 새 판을 여는 단추.** 그 한 번이면
 * 주소가 다시 열린다.
 *
 * 에러 경계는 아직 클래스 컴포넌트로만 만들 수 있다(React 19 기준). 그래서 이 파일만
 * 나머지와 모양이 다르다.
 */

import { Component, type ReactNode } from "react";

import { clear } from "@/lib/rogue/storage";

interface Props {
    children: ReactNode;
}

interface State {
    error: Error | null;
}

export default class GameBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error) {
        // 콘솔에는 남긴다 — 고치는 사람이 무엇이 터졌는지 알아야 한다.
        console.error("[rogue] 판이 터졌다:", error);
    }

    private restart = () => {
        clear();
        // 저장을 지운 채 통째로 다시 연다. 상태를 손으로 되돌리는 것보다 확실하다.
        window.location.reload();
    };

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <div className="grid h-full w-full place-items-center bg-[var(--rg-bg)] p-4">
                <div className="max-w-[420px] border border-[var(--rg-line)] bg-[var(--rg-panel)] p-4 font-[family-name:var(--font-plex-mono)] text-[13px] text-[var(--rg-text)]">
                    <p className="mb-2 text-[var(--rg-strong)]">판을 이어서 굴리지 못했다.</p>
                    <p className="mb-3 text-[var(--rg-muted)]">
                        저장된 판이 지금 규칙과 안 맞습니다. 저장을 지우고 새로 시작하면 됩니다 —
                        도감과 지난 판들은 지워지지 않습니다.
                    </p>
                    <button
                        type="button"
                        onClick={this.restart}
                        className="rounded-[2px] border border-[var(--rg-line)] px-3 py-1 text-[var(--rg-strong)] hover:bg-[var(--rg-raised)]"
                    >
                        저장을 지우고 새 판
                    </button>
                    <pre className="mt-3 max-h-24 overflow-auto whitespace-pre-wrap text-[11px] text-[var(--rg-ghost)]">
                        {this.state.error.message}
                    </pre>
                </div>
            </div>
        );
    }
}
