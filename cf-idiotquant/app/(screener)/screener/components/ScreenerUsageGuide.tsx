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
        title: "위험 신호 확인하기",
        description: "종목 배지와 제외 조건에서 중국 소재 소형주·저유동성·지속 현금 소진을 확인하세요. 중국 소재는 본사 국가로 판별하므로 해외 지주회사를 통한 중국 사업 전체를 포괄하지 않습니다. 거래대금은 하루 기준이며, 현금 소진은 최근 3개 연도 영업현금흐름이 모두 음수인 경우입니다. 미확인은 안전을 뜻하지 않으며 제외 조건에서도 남습니다.",
    },
    {
        title: "분석하고 관심 종목 저장하기",
        description: "결과의 종목을 누르면 상세 분석으로 이동합니다. 로그인 후 하트로 저장한 종목은 ‘관심’에서 다시 보세요. 관심 목록에도 현재 필터가 적용됩니다.",
    },
    {
        title: "후보를 나란히 비교하기",
        description: "발굴 결과 옆의 비교 버튼을 누르세요. 비로그인은 최대 4종목, 로그인하면 최대 20종목을 선택할 수 있습니다. 비교 화면에서 날짜를 더 추가할 수 있습니다.",
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
            <ol className="grid gap-4 px-3 py-3">
                {steps.map((step, index) => (
                    <li key={step.title}>
                        <h2 className="text-sm font-semibold"><span className="mr-1.5 text-brand-ink">{index + 1}.</span>{step.title}</h2>
                        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{step.description}</p>
                    </li>
                ))}
            </ol>
            <p className="px-3 pb-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                비로그인도 필터·정렬·보기 전환을 이용할 수 있으며 결과는 조건별 상위 10개까지 표시됩니다. 전체 결과와 관심종목 저장·팩터 실험실은 로그인 후 이용하세요. 결과가 없다면 적용 조건의 ×로 조건을 하나씩 풀거나 ‘전체 해제’로 다시 시작하세요. 조건에 맞는 종목도 상세 분석에서 재무와 위험도를 함께 확인하세요.
            </p>
        </details>
    );
}
