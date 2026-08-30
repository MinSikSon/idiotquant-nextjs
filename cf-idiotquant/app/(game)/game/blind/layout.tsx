import type { Metadata } from "next";

// 블라인드 차트가 /game 에서 여기로 내려오면서, 그 화면을 가리키던 말도 함께 내려온다.
// 위(app/(game)/layout.tsx)는 이제 로그라이크를 설명하므로 여기서 덮어쓴다.

export const metadata: Metadata = {
    title: "내 운용사 - 블라인드 차트 리플레이 투자 게임",
    description:
        "어느 종목인지 모르는 차트를 하루씩 넘기며 사고팝니다. 반기마다 성적이 맡은 돈에 곱해지고, 고객이 돈을 맡기거나 빼갑니다. 종목명과 시기는 판이 끝나야 열립니다.",
    keywords: [
        "주식 게임", "투자 시뮬레이션", "블라인드 차트", "차트 리플레이",
        "모의투자", "주식 연습", "매매 습관",
    ],
    alternates: { canonical: "https://idiotquant.com/game/blind" },
    openGraph: {
        title: "내 운용사 | IdiotQuant",
        description: "어느 종목인지 모르는 차트를 하루씩 넘기며 굴리는 투자 게임.",
        url: "https://idiotquant.com/game/blind",
    },
};

export default function BlindLayout({ children }: { children: React.ReactNode }) {
    return children;
}
