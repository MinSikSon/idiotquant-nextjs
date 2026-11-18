import type { ScreenerFilters } from './filters';

export type WorldcupAnswer = 'a' | 'b' | 'unknown' | 'neither';
export type WorldcupFilters = Pick<ScreenerFilters, 'excludeDeficit' | 'maxPer' | 'maxPbr' | 'minTrAmt'>;

// 시장 한 글자 + 네 답변. 서버 저장 없이도 같은 선택을 다시 열 수 있다.
export function worldcupCode(country: 'KR' | 'US', answers: readonly WorldcupAnswer[]) {
    if (answers.length !== 4 || answers.some(answer => !['a', 'b', 'unknown', 'neither'].includes(answer))) return null;
    return `${country === 'US' ? 'u' : 'k'}${answers.map(answer => answer === 'unknown' ? 'u' : answer === 'neither' ? 'n' : answer).join('')}`;
}

export function readWorldcupCode(code: string | null) {
    if (!code || !/^[ku][abun]{4}$/.test(code)) return null;
    return {
        country: code[0] === 'u' ? 'US' as const : 'KR' as const,
        answers: [...code.slice(1)].map(value => value === 'u' ? 'unknown' : value === 'n' ? 'neither' : value) as WorldcupAnswer[],
    };
}

export function expandWorldcupParams(query: string) {
    const params = new URLSearchParams(query);
    const selection = readWorldcupCode(params.get('w'));
    if (!selection) return params;
    const proposal = worldcupFilters(selection.answers, selection.country);
    if (!params.has('country')) params.set('country', selection.country);
    for (const [key, value] of [['maxper', proposal.maxPer], ['maxpbr', proposal.maxPbr], ['mintr', proposal.minTrAmt]] as const) {
        if (!params.has(key)) params.set(key, String(value));
    }
    const exclude = new Set(params.get('exclude')?.split(',').filter(Boolean));
    if (proposal.excludeDeficit) exclude.add('deficit');
    params.set('exclude', [...exclude].join(','));
    return params;
}

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
            a: { title: '흑자 기업부터', description: '이익을 내는 기업부터 찾아요.', value: '적자 기업 제외', tradeoff: '회복 중인 적자 기업은 후보에서 빠집니다.' },
            b: { title: '적자도 살펴보기', description: '적자여도 회복 가능성을 봐요.', value: '적자 제외 미적용', tradeoff: 'PER 조건을 함께 적용하면 PER 비교가 어려운 적자 기업은 제외될 수 있습니다.' },
        },
        {
            label: '이익 대비 가격', question: 'PER로 후보를 좁힐까요?',
            context: '낮은 PER이 더 좋은 기업이라는 뜻은 아닙니다. 탐색 범위의 선택입니다.',
            a: { title: '가격 조건으로 좁히기', description: '이익에 비해 가격이 낮은 기업부터 봐요.', value: 'PER 20배 이하', tradeoff: '높은 PER의 기업과 PER 비교가 어려운 기업은 빠집니다.' },
            b: { title: '상한 없이 비교하기', description: '이익 대비 가격은 종목별로 판단해요.', value: 'PER 상한 없음', tradeoff: '고평가 가능성을 종목별로 직접 확인해야 합니다.' },
        },
        {
            label: '자산 대비 가격', question: 'PBR도 제한할까요?',
            context: '이익 기준과 별개로, 순자산 대비 가격 조건을 추가할지 정합니다.',
            a: { title: '자산 가격도 제한하기', description: '보유 자산에 비해 가격이 낮은 기업부터 봐요.', value: 'PBR 1.5배 이하', tradeoff: '무형 자산의 비중이 큰 기업 등이 빠질 수 있습니다.' },
            b: { title: '상한 없이 살펴보기', description: '자산 외의 가치도 함께 살펴봐요.', value: 'PBR 상한 없음', tradeoff: '자산 가치와 현재 가격의 관계를 따로 확인해야 합니다.' },
        },
        {
            label: '거래 규모', question: '거래가 적은 종목도 살펴볼까요?',
            context: '스캔일 거래대금 기준입니다. 기간 평균이나 실시간 값이 아닙니다.',
            a: { title: '거래 규모로 좁히기', description: '일정 거래 규모를 갖춘 종목부터 봐요.', value: country === 'US' ? '거래대금 1백만 달러 이상' : '거래대금 10억원 이상', tradeoff: '거래가 적은 종목의 기회도 함께 제외됩니다.' },
            b: { title: '거래가 적어도 포함', description: '거래 규모와 관계없이 기회를 찾아요.', value: '거래대금 하한 없음', tradeoff: '원하는 가격·시점에 거래하기 어려울 수 있습니다.' },
        },
    ];
}
