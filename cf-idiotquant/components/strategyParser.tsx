import { Callout, Card, Divider, Elevation, H4, Icon, Intent } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import { useMemo } from "react";

const parseStrategyId = (id: string) => {
    const parts = id.split('_');
    // 형식: [국가, IQ, 지표, 연도, 분기, 시가총액]
    // 예: US_IQ_NCAV1.5_2025_Q0_MCAP0

    const [country, prefix, metricRaw, year, quarterRaw, mcapRaw] = parts;

    // 1. 국가 해석
    const countryName = country === "US" ? "미국(US) 시장" : "한국(KR) 시장";
    const countryContext = country === "US"
        ? "글로벌 금융의 중심인 미국 시장의 방대한 데이터를 바탕으로"
        : "역동적인 한국 자본 시장의 상장 기업들을 전수 조사하여";

    // 2. 지표 해석 (NCAV)
    const ratio = metricRaw.replace("NCAV", "");
    const metricTitle = `NCAV(청산가치) ${ratio}배 안전마진 전략`;

    // 문구 랜덤화를 위한 배열
    const descriptions = [
        `기업이 보유한 순유동자산이 시가총액 대비 ${ratio}배를 상회하는 종목을 발굴합니다. 이는 '장부상 현금이 주가보다 많은' 상태를 뜻합니다.`,
        `벤저민 그레이엄의 원칙에 따라, 기업의 실제 청산가치가 시장 평가액보다 ${ratio}배 높은 절대적 저평가 기업을 필터링합니다.`,
        `시장에서 극도로 소외되어 기업 가치보다 현저히 낮은 가격에 거래되는 ${ratio}배수 안전마진 종목군을 선정합니다.`
    ];

    // 3. 분기 및 시가총액
    const quarter = quarterRaw === "Q0" ? "연간 확정 실적" : `${quarterRaw.replace("Q", "")}분기 데이터`;
    const mcap = mcapRaw === "MCAP0" ? "전 종목(All-Cap)" : `시가총액 상위 ${mcapRaw.replace("MCAP", "")}%`;

    // ID 길이를 기반으로 간단한 해시를 만들어 문구 랜덤 선택 (중복 방지)
    const hash = id.length % descriptions.length;

    return {
        title: `[${country}] ${metricTitle}`,
        description: `${countryContext}, ${descriptions[hash]}`,
        details: `본 포트폴리오는 ${year}년 ${quarter} 기준 재무제표를 반영하고 있습니다. ${mcap}을 분석 대상으로 삼아 정량적 필터링을 완료했습니다.`,
        philosophy: `데이터 기반의 ${countryName} 퀀트 투자는 인간의 편향을 제거하고 오직 숫자가 증명하는 저평가 기회에만 집중합니다.`
    };
};

export default function StrategyDescription({ strategyId }: { strategyId: string }) {
    const content = useMemo(() => parseStrategyId(strategyId), [strategyId]);

    return (
        <Card elevation={Elevation.ZERO} className="!bg-white dark:!bg-zinc-900 border border-blue-100 dark:border-blue-900/30 !p-6 mb-6 rounded-xl shadow-sm">
            {/* 상단 타이틀 섹션 */}
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg shrink-0">
                    <Icon icon={IconNames.LIGHTBULB} intent={Intent.PRIMARY} size={20} />
                </div>
                <div className="min-w-0 flex-1">
                    <H4 className="!m-0 text-blue-600 dark:text-blue-400 font-bold truncate">
                        {content.title}
                    </H4>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5 uppercase tracking-wider">
                        {strategyId}
                    </p>
                </div>
            </div>

            <Divider className="my-4" />

            {/* 메인 내용: Grid 활용으로 레이아웃 보호 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* 왼쪽: 전략 상세 (8칸) */}
                <div className="lg:col-span-8 space-y-4">
                    <section>
                        <h5 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Icon icon={IconNames.SEARCH_TEMPLATE} size={14} /> 전략 메커니즘
                        </h5>
                        <p className="text-[14px] leading-relaxed text-gray-800 dark:text-gray-200">
                            {content.description}
                        </p>
                    </section>

                    <section className="bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-gray-100 dark:border-zinc-800">
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-normal">
                            <Icon icon={IconNames.INFO_SIGN} size={12} className="mr-2" />
                            {content.details}
                        </p>
                    </section>
                </div>

                {/* 오른쪽: 용어 설명 및 주의사항 (4칸) */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100/50 dark:border-blue-800/30">
                        <h5 className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
                            Key Terms (용어 설명)
                        </h5>
                        <dl className="space-y-3">
                            <div>
                                <dt className="text-[11px] font-bold text-gray-900 dark:text-gray-100">NCAV</dt>
                                <dd className="text-[10px] text-gray-500 leading-tight mt-1">순유동자산가치. 기업이 가진 당장 현금화 가능한 자산에서 부채를 뺀 가치입니다.</dd>
                            </div>
                            <div>
                                <dt className="text-[11px] font-bold text-gray-900 dark:text-gray-100">Market Cap</dt>
                                <dd className="text-[10px] text-gray-500 leading-tight mt-1">시가총액. 발행주식수와 현재 주가를 곱한 기업의 전체 시장 가치입니다.</dd>
                            </div>
                            <div>
                                <dt className="text-[11px] font-bold text-gray-900 dark:text-gray-100">Safety Margin</dt>
                                <dd className="text-[10px] text-gray-500 leading-tight mt-1">안전마진. 실제 내재가치와 주가 사이의 차이로, 투자 리스크를 줄여주는 방어막입니다.</dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </div>

            {/* 하단 면책 조항: Full Width */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <p className="text-[10px] text-gray-400 leading-relaxed italic">
                    <Icon icon={IconNames.SHIELD} size={10} className="mr-1" />
                    <strong>Disclaimer:</strong> {content.philosophy} 본 리스트는 알고리즘에 의한 필터링 결과이며 종목 추천이 아닙니다. 모든 투자의 결과는 투자자 본인에게 귀속됩니다.
                </p>
            </div>
        </Card>
    );
}