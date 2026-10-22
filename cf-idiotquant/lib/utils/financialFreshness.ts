export type FinancialPeriod = { label: string; date: unknown };
export type FinancialFreshness = {
  status: 'fresh' | 'stale' | 'unknown';
  label: string;
  message: string;
  periods: string;
};

/** 결산 월만 제공되면 월말로 판단해, 날짜를 모르는 자료를 일찍 오래된 것으로 분류하지 않는다. */
function financialDate(value: unknown): { end: string; label: string } | null {
  if (typeof value !== 'string') return null;
  const match = value
    .trim()
    .match(/^(\d{4})[-.]?(\d{2})(?:[-.]?(\d{2}))?(?:[T ].*)?$/);
  if (!match) return null;
  const year = Number(match[1]),
    month = Number(match[2]);
  if (year < 1900 || month < 1 || month > 12) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = match[3] ? Number(match[3]) : lastDay;
  if (day < 1 || day > lastDay) return null;
  return {
    end: `${match[1]}-${match[2]}-${String(day).padStart(2, '0')}`,
    label: `${match[1]}.${match[2]}${match[3] ? `.${match[3]}` : ''}`,
  };
}

export function financialFreshness(
  periods: FinancialPeriod[],
  now = new Date()
): FinancialFreshness {
  const today = new Date(now.getTime() + 9 * 3600000);
  const year = today.getUTCFullYear(),
    month = today.getUTCMonth(),
    day = today.getUTCDate();
  const targetDay = Math.min(
    day,
    new Date(Date.UTC(year - 3, month + 1, 0)).getUTCDate()
  );
  const cutoff = new Date(Date.UTC(year - 3, month, targetDay))
    .toISOString()
    .slice(0, 10);
  const current = today.toISOString().slice(0, 10);
  const entries = periods.map((period) => ({
    ...period,
    parsed: financialDate(period.date),
  }));
  // 월 단위 기준일은 당월 말일까지 허용하지만 미래 회계연도는 확인된 날짜로 보지 않는다.
  const usable = entries.filter(
    (entry) =>
      entry.parsed &&
      entry.parsed.end.slice(0, 7) <= current.slice(0, 7) &&
      (entry.parsed.label.length === 7 || entry.parsed.end <= current)
  );
  const stale = usable.filter((entry) => entry.parsed!.end < cutoff);
  const unknown = entries.length === 0 || usable.length !== entries.length;
  const dates = usable
    .map((entry) => `${entry.label} ${entry.parsed!.label}`)
    .join(' · ');
  if (stale.length) {
    const oldDates = stale
      .map((entry) => `${entry.label} ${entry.parsed!.label}`)
      .join(' · ');
    return {
      status: 'stale',
      label: '재무정보 3년 경과',
      periods: dates,
      message: `${oldDates} 기준으로, 최근 3년 이내 재무정보가 아닙니다. 최신 재무정보를 확인해 주세요.${unknown ? ' 일부 재무 기준일도 확인할 수 없습니다.' : ''}`,
    };
  }
  if (unknown)
    return {
      status: 'unknown',
      label: '재무 기준일 미확인',
      periods: dates,
      message:
        '재무정보의 기준일을 확인할 수 없어 최근 3년 이내 자료인지 판단할 수 없습니다.',
    };
  return {
    status: 'fresh',
    label: '최근 3년 이내',
    periods: dates,
    message: '',
  };
}

export function scanFinancialPeriods(
  item: Record<string, any>
): FinancialPeriod[] {
  return [
    { label: '재무상태표', date: item.financial_bs_date },
    { label: '손익계산서', date: item.financial_is_date },
  ];
}

/** 주간 보관 자료는 해당 종목의 마지막 수집일을 사용한다. 화면의 선택일로 대체하지 않는다. */
export function scanCollectionDate(item: Record<string, any>): unknown {
  return item.period_end_date ?? item.scan_date;
}

/** 수집 당시 재무자료의 나이를 비교한다. 과거 결과를 오늘 기준으로 재판정하지 않는다. */
export function collectionFinancialFreshness(
  periods: FinancialPeriod[],
  collectedAt: unknown,
  now = new Date()
): FinancialFreshness & { collectionDate: string } {
  const collected = financialDate(collectedAt);
  const today = new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
  if (!collected || collected.label.length !== 10 || collected.end > today) {
    const dates = financialFreshness(periods, now).periods;
    return {
      status: 'unknown', label: '수집일 미확인', collectionDate: '',
      periods: dates,
      message: `수집일 미확인${dates ? ` · ${dates}` : ''}. 수집일과 재무 기준일의 차이를 판단할 수 없습니다.`,
    };
  }
  const result = financialFreshness(periods, new Date(`${collected.end}T00:00:00+09:00`));
  const valid = periods.flatMap(period => {
    const parsed = financialDate(period.date);
    return parsed && parsed.end <= collected.end ? [{ ...period, parsed }] : [];
  });
  const oldest = valid.map(period => period.parsed.end).sort()[0];
  let gap = '';
  if (oldest) {
    const days = Math.floor((Date.parse(collected.end) - Date.parse(oldest)) / 86400000);
    const [cy, cm, cd] = collected.end.split('-').map(Number);
    const [fy, fm, fd] = oldest.split('-').map(Number);
    const months = (cy - fy) * 12 + cm - fm - (cd < fd ? 1 : 0);
    gap = months < 1 ? `${days}일` : [
      months >= 12 ? `${Math.floor(months / 12)}년` : '',
      months % 12 ? `${months % 12}개월` : '',
    ].join(' ');
  }
  const dates = result.periods || '재무 기준일 미확인';
  const detail = `수집 ${collected.label} · ${dates}`;
  if (result.status === 'stale') return {
    ...result, collectionDate: collected.label,
    label: `수집일과 약 ${gap} 차이`,
    message: `${detail}. 수집 당시 이미 3년을 초과한 재무정보입니다.${valid.length < periods.length ? ' 일부 재무 기준일도 확인할 수 없습니다.' : ''}`,
  };
  return {
    ...result, collectionDate: collected.label,
    label: result.status === 'fresh' ? '수집일 기준 3년 이내' : result.label,
    message: result.status === 'fresh' ? `${detail}. 수집일 기준 최근 3년 이내 자료입니다.` : `${detail}. 수집일과 일부 재무 기준일의 차이를 확인할 수 없습니다.`,
  };
}

/** 지표 계산이 사용하는 첫 응답 행의 회계 종료일을 확인한다. 수집일·공시 제출일로 대체하지 않는다. */
export function analysisFinancialPeriods(
  data: any,
  market: 'KR' | 'US'
): FinancialPeriod[] {
  if (market === 'US')
    return [{ label: '재무제표', date: data?.finnhubData?.data?.[0]?.endDate }];
  return [
    ['재무상태표', data?.kiBS],
    ['손익계산서', data?.kiIS],
  ].flatMap(([label, report]) => {
    if (report?.state === 'pending' || report?.state === 'init') return [];
    return [{ label: String(label), date: report?.output?.[0]?.stac_yymm }];
  });
}

export function financialSourceLabel(source: unknown): string {
  if (source === 'sec') return 'SEC EDGAR';
  if (source === 'finnhub') return 'Finnhub';
  if (source === 'kis') return '한국투자증권';
  return '';
}
