// 게임 밖 페이지로 가는 문 — **버튼처럼 생겨야 버튼이다.**
//
// ── 왜 이 파일이 생겼나 ────────────────────────────────────────
// 도감과 이력으로 가는 길은 캔버스 아래의 **12px 밑줄 글자 두 개**였다. 게임 화면은
// 처음부터 끝까지 90년대 윈도우의 은회색 3D 판인데, 그 아래에 웹 링크가 붙어 있으니
// **화면에서 유일하게 안 눌러 보이는 것**이 하필 눌러야 하는 것이었다.
//
// 여기는 캔버스가 아니라 리액트 페이지라 `ui/win95.ts` 의 `btnFace` 를 못 쓴다.
// 그래서 같은 모양을 CSS 로 한 번 더 짓는다 — 색은 `ui/theme.ts` 의 팔레트 그대로다.
//
//   면        `C.panel`   #c3c7cb
//   위·왼쪽   `C.lit`     #ffffff   — 뒤집히면 튀어나온 것이 들어간 것이 된다
//   아래·오른 `C.line`    #6d7276
//   글자      `S.faceInk` #101418   — **회색 면 위는 검은 글자다**
//
// 누르는 동안 테를 뒤집고 글자를 1px 내린다. 그 시절 단추가 실제로 그랬고,
// 캔버스 쪽 버튼(`pressable`)도 같은 일을 한다.

import Link from "next/link";

/**
 * 버튼 한 칸.
 *
 * **크기는 하나고, 눕힌 화면에서만 줄어든다.** 폰을 눕히면 세로가 300px 남짓이라
 * 몇 px 이 아까운데, 그렇다고 문을 없애면 **눕힌 채로는 이력에 갈 길이 아예 없다.**
 * 예전에 그랬다.
 */
export function WinLink({
    href, children, tone = "normal",
}: {
    href: string;
    children: React.ReactNode;
    /** `primary` 는 한 단 밝은 면. 한 줄에 하나만 쓴다. */
    tone?: "normal" | "primary";
}) {
    // 기본 단추는 **검은 테 한 겹**을 두른다 — 캔버스 쪽 `btnFace` 의 `ring` 과 같은
    // 규약이다. 그 시절 대화상자가 이것 하나로 「이게 기본이다」를 말했다.
    const face = tone === "primary"
        ? "bg-[#d6dade] shadow-[0_0_0_1px_#3b3f42]"
        : "bg-[#c3c7cb]";
    // **완성된 클래스 이름으로 적는다.** Tailwind 는 소스에서 글자 그대로 찾으므로
    // 런타임에 조립한 이름은 아예 생성되지 않는다.
    const pad = "px-4 py-1.5 text-[12px] [@media(max-height:500px)]:px-3"
        + " [@media(max-height:500px)]:py-[3px] [@media(max-height:500px)]:text-[11px]";
    return (
        <Link
            href={href}
            className={
                `${face} ${pad} inline-block select-none border-2 border-b-[#6d7276] border-l-white`
                + " border-r-[#6d7276] border-t-white font-mono text-[#101418]"
                // 누르면 테가 뒤집히고 글자가 1px 내려간다. **여백을 건드리지 않는다** —
                // 크기가 둘이라 여백으로 밀면 두 크기에 다른 값을 적어야 한다.
                + " active:border-b-white active:border-l-[#6d7276] active:border-r-white"
                + " active:border-t-[#6d7276] active:[&>span]:translate-x-px"
                + " active:[&>span]:translate-y-px"
                + " focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                + " focus-visible:outline-[#0a246a]"
            }
        >
            <span className="block">{children}</span>
        </Link>
    );
}

/**
 * 버튼이 놓이는 판. **버튼은 회색 판 위에 놓이지 허공에 떠 있지 않다** —
 * 캔버스 쪽 버튼 띠(`TradingScene.buttons`)와 같은 규약이다.
 */
export function WinBar({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={
                `flex shrink-0 items-center justify-center gap-3 border-t-2 border-t-white`
                + ` bg-[#c3c7cb] px-3 py-2 ${className}`
            }
        >
            {children}
        </div>
    );
}
