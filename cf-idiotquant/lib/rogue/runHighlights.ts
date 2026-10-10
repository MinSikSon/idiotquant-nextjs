export interface RunHighlight {
    log: string;
    score: number;
}

function messageBody(log: string): string {
    return log
        .replace(/^T:\d+\s*/, "")
        .replace(/^[1-4]P(?:▸)?\s*/, "");
}

function dangerScore(body: string): number {
    if (/생명 구명|죽음을 막았다|쓰러졌다|굶어 쓰러졌다/.test(body)) return 100;
    const damage = /피해\s*(\d+)|(\d+)\s*피해/.exec(body);
    if (damage) return 40 + Number(damage[1] ?? damage[2]);
    if (/독이 퍼|화상|불길로 .*피해|함정에 빠|허기가|굶|저주|수호자.*깨어났다/.test(body)) return 30;
    return 0;
}

function itemScore(body: string): number {
    const pickup = /^[a-z]\)\s+(.+)$/.exec(body);
    if (!pickup) return 0;
    const item = pickup[1];
    if (/금화|식량|화살|탄환/.test(item)) return 0;
    if (/옌더의 증표|엑스칼리버|희귀 전리품|전설/.test(item)) return 100;
    if (/\+\d|축복|보석|검|장검|갑옷|방패|반지|지팡이|마법책|주문서|물약|목걸이/.test(item)) return 60;
    return 25;
}

function topHighlights(logs: string[], scoreOf: (body: string) => number): RunHighlight[] {
    return logs
        .map((log, index) => ({ log, index, score: scoreOf(messageBody(log)) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || b.index - a.index)
        .slice(0, 3)
        .sort((a, b) => a.index - b.index)
        .map(({ log, score }) => ({ log, score }));
}

export function runHighlights(logs: string[]) {
    const visibleLogs = logs.filter((log) => !log.startsWith("· "));
    return {
        dangers: topHighlights(visibleLogs, dangerScore),
        finds: topHighlights(visibleLogs, itemScore),
    };
}
