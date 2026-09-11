import type { Metadata } from "next";

// `/game` 은 Rogue(1980) 클론이다. 옛 게임은 `/game/imf` 로 옮겼고 제목도 거기서 진다.
export const metadata: Metadata = {
    title: "로그 - 웹에서 하는 오리지널 로그라이크",
    description:
        "1980년 Rogue 를 웹으로 옮겼습니다. 지하 26층의 옌더의 증표를 찾아 살아서 돌아오십시오. 방마다 어둡고, 물약은 마셔 봐야 알고, 죽으면 그것으로 끝입니다.",
    keywords: [
        "로그라이크", "Rogue", "던전", "턴제", "퍼머데스",
        "웹게임", "ASCII 게임", "고전 게임",
    ],
    alternates: { canonical: "https://idiotquant.com/game" },
    openGraph: {
        title: "로그 | IdiotQuant",
        description: "지하 26층. 옌더의 증표를 찾아 살아서 돌아오십시오.",
        url: "https://idiotquant.com/game",
    },
};

export default function RogueLayout({ children }: { children: React.ReactNode }) {
    return children;
}
