"use client";

// 관리자가 **일반 사용자의 화면**을 보는 모드.
//
// 관리자에게만 뜨는 메뉴(전략 히스토리·회원 관리·포트폴리오)가 늘어나면서, 정작 그 화면을
// 만든 사람은 일반 사용자가 무엇을 보는지 확인할 길이 없어졌다. 계정을 하나 더 만들어
// 로그인해 보는 것 말고는.
//
// ── 이것은 권한이 아니라 **표시**다 ────────────────────────────────
// 켜도 역할은 그대로 admin 이다. 미들웨어(서버)는 이 값을 아예 모르고, `/admin` 도 주소를
// 치면 그대로 열린다. 브라우저에 저장된 값 하나로 권한이 바뀐다면 그것이 곧 구멍이다 —
// 여기서 하는 일은 "관리자에게만 그리던 것을 안 그리는 것" 뿐이다.
//
// ── 왜 Redux 가 아닌가 ──────────────────────────────────────────────
// 새로고침을 넘어 남아야 하고(localStorage), 값 하나뿐이고, 이것을 읽는 곳이 내비게이션과
// 내 계정 둘뿐이다. 슬라이스를 만들면 파일 셋이 늘고 얻는 것이 없다. 대신 같은 탭의 다른
// 컴포넌트끼리는 커스텀 이벤트로, 다른 탭끼리는 `storage` 이벤트로 맞춘다.

import { useEffect, useState } from "react";

const KEY = "iq:viewAsUser";
/** 같은 탭 안에서 켜고 끄는 것을 알리는 신호. `storage` 는 **다른 탭에만** 간다. */
const EVENT = "iq:viewAsUser";

export function readViewAsUser(): boolean {
    // 시크릿 창·저장 차단에서는 접근 자체가 던진다. 못 읽으면 그냥 끈 것으로 본다.
    try {
        return window.localStorage.getItem(KEY) === "1";
    } catch {
        return false;
    }
}

export function setViewAsUser(on: boolean): void {
    try {
        if (on) window.localStorage.setItem(KEY, "1");
        else window.localStorage.removeItem(KEY);
    } catch {
        /* 저장을 못 해도 이번 화면에서는 켜진다 — 아래 신호는 그대로 보낸다 */
    }
    window.dispatchEvent(new Event(EVENT));
}

/**
 * 지금 일반 사용자 화면으로 보고 있는가.
 *
 * **첫 렌더에서는 언제나 `false`** 다. 서버는 localStorage 를 못 보므로, 첫 렌더에서
 * 저장된 값을 쓰면 서버가 그린 것과 브라우저가 그린 것이 달라 하이드레이션이 어긋난다.
 * 켜 둔 채로 새로고침하면 관리자 메뉴가 한 프레임 스쳤다 사라진다 — 그 편이 낫다.
 */
export function useViewAsUser(): boolean {
    const [on, setOn] = useState(false);

    useEffect(() => {
        const sync = () => setOn(readViewAsUser());
        sync();
        window.addEventListener(EVENT, sync);
        window.addEventListener("storage", sync);
        return () => {
            window.removeEventListener(EVENT, sync);
            window.removeEventListener("storage", sync);
        };
    }, []);

    return on;
}
