const topics = [
    {
        title: "전략 조합",
        description: "전략을 여러 개 고르면 선택한 전략을 모두 충족하는 종목을 찾습니다.",
    },
    {
        title: "전략과 필터",
        description: "전략으로 찾은 종목 중에서 시가총액·PER·PBR 등 필터도 충족하는 종목을 보여줍니다.",
    },
    {
        title: "위험 신호",
        description: "중국 소재 소형주는 본사 국가로 판별하므로, 해외 지주회사를 통해 중국에서 사업하는 기업은 빠질 수 있습니다. 저유동성은 하루 거래대금, 현금 소진은 최근 3개 연도 영업현금흐름으로 판단합니다. 자료가 없어 위험을 판별하지 못한 종목은 제외 조건을 켜도 남습니다.",
    },
    {
        title: "관심종목",
        description: "로그인한 뒤 하트로 저장한 종목은 ‘관심’에서 볼 수 있습니다. 현재 필터는 관심종목에도 적용됩니다.",
    },
    {
        title: "종목 비교",
        description: "결과 옆 비교 버튼으로 종목을 추가하세요. 로그인 전에는 최대 4종목, 로그인 후에는 최대 20종목을 비교할 수 있습니다.",
    },
];

export default function ScreenerUsageGuide() {
    return (
        <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:outline-brand-ink dark:text-neutral-200 dark:hover:bg-surface-dark-hover [&::-webkit-details-marker]:hidden">
                스크리너 사용 가이드
                <span aria-hidden="true" className="text-neutral-400 group-open:hidden">＋</span>
                <span aria-hidden="true" className="hidden text-neutral-400 group-open:inline">−</span>
            </summary>
            <ul className="grid gap-4 px-3 py-3">
                {topics.map(topic => (
                    <li key={topic.title}>
                        <h2 className="text-sm font-semibold">{topic.title}</h2>
                        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{topic.description}</p>
                    </li>
                ))}
            </ul>
            <p className="px-3 pb-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                로그인 전에는 결과를 상위 10개까지 볼 수 있습니다. 결과가 없으면 조건 옆 ×로 하나씩 빼거나 ‘전체 해제’를 누르세요.
            </p>
        </details>
    );
}
