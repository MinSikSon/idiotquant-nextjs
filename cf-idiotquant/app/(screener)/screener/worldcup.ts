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
            context: country === 'US'
                ? '순이익이 양수인 기업을 흑자로 봅니다. 순이익 자료가 없으면 주당순이익(EPS)을 씁니다. PER 조건을 함께 적용하면 적자 기업은 결과에서 빠질 수 있습니다.'
                : '주당순이익(EPS)이 양수인 기업을 흑자로 봅니다. PER 조건을 함께 적용하면 PER이 0 이하이거나 자료가 없는 기업은 빠집니다.',
            a: { title: '흑자만', value: '적자 기업 제외' },
            b: { title: '적자도 포함', value: '적자 제외 미적용' },
        },
        {
            label: '이익 대비 가격', question: 'PER로 후보를 좁힐까요?',
            context: 'PER은 주가를 주당순이익(EPS)으로 나눈 값입니다. 상한을 선택하면 PER이 0 이하이거나 자료가 없는 기업도 빠집니다.',
            a: { title: 'PER 20배 이하', value: 'PER 20배 이하' },
            b: { title: '제한 없음', value: 'PER 상한 없음' },
        },
        {
            label: '자산 대비 가격', question: 'PBR도 제한할까요?',
            context: 'PBR은 주가를 주당순자산(BPS)으로 나눈 값입니다. 상한을 선택하면 PBR이 0 이하이거나 자료가 없는 기업도 빠집니다.',
            a: { title: 'PBR 1.5배 이하', value: 'PBR 1.5배 이하' },
            b: { title: '제한 없음', value: 'PBR 상한 없음' },
        },
        {
            label: '거래 규모', question: '거래가 적은 종목도 살펴볼까요?',
            context: '스캔일 하루 거래대금으로 비교합니다. 거래대금이 적은 종목은 원하는 가격이나 시점에 거래하기 어려울 수 있습니다.',
            a: { title: country === 'US' ? '100만 달러 이상' : '10억원 이상', value: country === 'US' ? '거래대금 1백만 달러 이상' : '거래대금 10억원 이상' },
            b: { title: '제한 없음', value: '거래대금 하한 없음' },
        },
    ];
}
