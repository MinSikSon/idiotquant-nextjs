import { format, subYears } from 'date-fns';

export function localToday(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// 날짜 입력·발굴 링크·저장본 모두 실제 달력 날짜와 사용자의 오늘을 기준으로 검사한다.
export function isComparisonDate(value: unknown, today = localToday()): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-') || value > today) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

export function defaultComparisonDates(today = new Date()): string[] {
  return [format(subYears(today, 1), 'yyyy-MM-dd'), localToday(today)];
}
