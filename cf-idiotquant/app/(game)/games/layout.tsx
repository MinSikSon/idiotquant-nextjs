import type { Metadata } from "next";

// `/games` 는 Rogue(1980) 클론이다.
export const metadata: Metadata = {
    // Safari 일반 탭의 주소창은 웹페이지가 접힘 상태를 제어할 수 없다.
    // 홈 화면에 추가해 실행할 때는 독립형 게임 화면으로 연다.
    appleWebApp: {
        capable: true,
        title: "IdiotGames",
        statusBarStyle: "black-translucent",
    },
    title: "로그 - 웹에서 하는 오리지널 로그라이크",
    description:
        "1980년 Rogue 를 웹으로 옮겼습니다. 지하 26층의 옌더의 증표를 찾아 살아서 돌아오십시오. 방마다 어둡고, 포션은 마셔 봐야 알고, 죽으면 그것으로 끝입니다.",
    keywords: [
        "로그라이크", "Rogue", "던전", "턴제", "퍼머데스",
        "웹게임", "ASCII 게임", "고전 게임",
    ],
    alternates: { canonical: "https://idiotquant.com/games" },
    openGraph: {
        title: "로그 | IdiotQuant",
        description: "지하 26층. 옌더의 증표를 찾아 살아서 돌아오십시오.",
        url: "https://idiotquant.com/games",
    },
};

export default function RogueLayout({ children }: { children: React.ReactNode }) {
    return children;
}
