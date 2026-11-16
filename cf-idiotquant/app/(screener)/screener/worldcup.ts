import type { ScreenerFilters } from './filters';

export type WorldcupAnswer = 'a' | 'b' | 'unknown' | 'neither';
export type WorldcupFilters = Pick<ScreenerFilters, 'excludeDeficit' | 'maxPer' | 'maxPbr' | 'minTrAmt'>;

export function worldcupFilters(answers: readonly (WorldcupAnswer | undefined)[], country: 'KR' | 'US'): WorldcupFilters {
    return {
        excludeDeficit: answers[0] === 'a',
        maxPer: answers[1] === 'a' ? 20 : 0,
        maxPbr: answers[2] === 'a' ? 1.5 : 0,
        minTrAmt: answers[3] === 'a' ? (country === 'US' ? 1 : 10) : 0,
    };
}

export function worldcupRounds(country: 'KR' | 'US') {
    return [
        {
            label: '이익 상태', question: '적자 기업도 후보에 넣을까요?',
            context: '다른 조건을 추가하기 전에, 살펴볼 기업의 범위를 정합니다.',
            a: { title: '흑자 기업부터', description: '현재 이익을 내는 기업 안에서 후보를 찾고 싶어요.', value: '적자 기업 제외', tradeoff: '회복 중인 적자 기업은 후보에서 빠집니다.' },
            b: { title: '적자도 살펴보기', description: '아직 적자여도, 회복 가능성을 직접 확인하고 싶어요.', value: '적자 제외 미적용', tradeoff: 'PER 조건을 함께 적용하면 PER 비교가 어려운 적자 기업은 제외될 수 있습니다.' },
        },
        {
            label: '이익 대비 가격', question: 'PER로 후보를 좁힐까요?',
            context: '낮은 PER이 더 좋은 기업이라는 뜻은 아닙니다. 탐색 범위의 선택입니다.',
            a: { title: '가격 조건으로 좁히기', description: '현재 이익 대비 가격이 일정 수준 이하인 기업부터 볼게요.', value: 'PER 20배 이하', tradeoff: '높은 PER의 기업과 PER 비교가 어려운 기업은 빠집니다.' },
            b: { title: '상한 없이 비교하기', description: 'PER이 높다는 이유만으로 후보를 제외하지 않을게요.', value: 'PER 상한 없음', tradeoff: '고평가 가능성을 종목별로 직접 확인해야 합니다.' },
        },
        {
            label: '자산 대비 가격', question: 'PBR도 제한할까요?',
            context: '이익 기준과 별개로, 순자산 대비 가격 조건을 추가할지 정합니다.',
            a: { title: '자산 가격도 제한하기', description: '순자산 대비 가격이 일정 수준 이하인 기업부터 볼게요.', value: 'PBR 1.5배 이하', tradeoff: '무형 자산의 비중이 큰 기업 등이 빠질 수 있습니다.' },
            b: { title: '상한 없이 살펴보기', description: '장부상 자산 대비 가격만으로 후보를 제외하지 않을게요.', value: 'PBR 상한 없음', tradeoff: '자산 가치와 현재 가격의 관계를 따로 확인해야 합니다.' },
        },
        {
            label: '거래 규모', question: '거래가 적은 종목도 살펴볼까요?',
            context: '스캔일 거래대금 기준입니다. 기간 평균이나 실시간 값이 아닙니다.',
            a: { title: '거래 규모로 좁히기', description: '거래대금이 일정 수준 이상인 종목부터 볼게요.', value: country === 'US' ? '거래대금 1백만 달러 이상' : '거래대금 10억원 이상', tradeoff: '거래가 적은 종목의 기회도 함께 제외됩니다.' },
            b: { title: '거래가 적어도 포함', description: '거래대금만으로 후보를 제외하지 않을게요.', value: '거래대금 하한 없음', tradeoff: '원하는 가격·시점에 거래하기 어려울 수 있습니다.' },
        },
    ];
}
