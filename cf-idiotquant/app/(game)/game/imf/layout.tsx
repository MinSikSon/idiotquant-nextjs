import type { Metadata } from "next";

// 옛 게임 — 1997 IMF 증권맨 로그라이크. `/game` 이 Rogue 클론으로 바뀌면서 이리로 옮겼다.
// 링크는 메뉴 어디에도 없고, 아는 사람만 주소로 들어온다.
export const metadata: Metadata = {
    title: "IMF 모의투자 - 카드 덱빌딩 주식 로그라이크",
    description:
        "1997년 증권맨이 되어 고객에게 종목을 권하고 보수로 빚을 갚습니다. 알아보고, 근거를 대고, 기다립니다.",
    keywords: ["주식 게임", "로그라이크", "덱빌딩", "투자 시뮬레이션", "모의투자", "IMF"],
    alternates: { canonical: "https://idiotquant.com/game/imf" },
    openGraph: {
        title: "IMF 모의투자 | IdiotQuant",
        description: "1997년. 알아보고, 권하고, 기다린다.",
        url: "https://idiotquant.com/game/imf",
    },
};

export default function ImfLayout({ children }: { children: React.ReactNode }) {
    return children;
}
