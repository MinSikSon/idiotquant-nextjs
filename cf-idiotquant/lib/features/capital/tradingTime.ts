const kstFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

export function formatTradingTime(value?: string, legacyKst = false): string {
    if (!value) return "기록 없음";
    let timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return "시각 확인 불가";
    // Worker time_stamp는 KST로 9시간 이동한 Date.toString() 값이다.
    // last_result.at의 ISO UTC 및 추후 ISO 실행 기록에는 이 보정을 적용하지 않는다.
    if (legacyKst && /\bGMT[+-]\d{4}\b/.test(value)) timestamp -= 9 * 3600_000;
    const parts = Object.fromEntries(kstFormatter.formatToParts(timestamp).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} KST`;
}
