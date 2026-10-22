const steps = [
    {
        title: "시장과 전략 고르기",
        description: "국내·미국을 고른 뒤 ‘전략’을 펼쳐 기준을 선택하세요. 여러 전략은 OR로 하나 이상, AND로 모두 충족하는 종목을 찾습니다.",
    },
    {
        title: "필터로 후보 좁히기",
        description: "‘필터’에서 시가총액·PER·PBR 등 조건을 조정하세요. 선택한 전략에 필터 조건이 함께 적용됩니다. 처음에는 한두 조건부터 시작하세요.",
    },
    {
        title: "분석하고 관심 종목 저장하기",
        description: "결과의 종목을 누르면 상세 분석으로 이동합니다. 하트로 저장한 종목은 ‘관심’에서 다시 보세요. 관심 목록에도 현재 필터가 적용됩니다.",
    },
    {
        title: "후보를 나란히 비교하기",
        description: "발굴 결과 옆의 비교 버튼을 누르세요. 현재 정렬 순서에서 최대 20종목과 기준일을 가져옵니다. 비교 화면에서 날짜를 더 추가할 수 있습니다.",
    },
];

export default function ScreenerUsageGuide() {
    return (
        <div className="mx-auto max-w-[1600px] px-4 py-3 sm:px-6">
            <details open className="group rounded-xl border border-neutral-200 bg-white dark:border-surface-dark-border dark:bg-surface-dark-card">
                <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
                    <span className="text-sm font-bold">스크리너 사용 가이드</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">전략 선택 → 필터 조정 → 분석·저장 → 비교</span>
                    <span aria-hidden="true" className="ml-auto text-xs text-neutral-500 group-open:hidden">펼치기 ＋</span>
                    <span aria-hidden="true" className="ml-auto hidden text-xs text-neutral-500 group-open:inline">접기 −</span>
                </summary>
                <ol className="grid gap-4 border-t border-neutral-200 px-4 py-4 dark:border-surface-dark-border sm:grid-cols-2 xl:grid-cols-4">
                    {steps.map((step, index) => (
                        <li key={step.title}>
                            <h2 className="text-xs font-bold"><span className="mr-1.5 text-brand-ink">{index + 1}.</span>{step.title}</h2>
                            <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">{step.description}</p>
                        </li>
                    ))}
                </ol>
                <p className="px-4 pb-4 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                    결과가 없다면 적용 조건의 ×로 조건을 하나씩 풀거나 ‘전체 해제’로 다시 시작하세요. 조건에 맞는 종목도 상세 분석에서 재무와 위험도를 함께 확인하세요.
                </p>
            </details>
        </div>
    );
}
