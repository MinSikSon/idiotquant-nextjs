// 이번 반기는 누가 맡겼고, 무엇을 해내야 하는가.
//
// 워커의 src/lib/season.js 와 짝이다. 값이 어긋나면 준비 화면이 말한 고객과 정산이
// 쓴 고객이 달라진다 — 한쪽을 고치면 반드시 다른 쪽도 고칠 것.
//
// ── 왜 저장하지 않는가 ────────────────────────────────────────────
// 캠페인 id 와 반기 번호에서 **파생**한다. 컬럼을 늘리지 않아도 되고, 지난 기록을 열 때도
// 같은 값이 다시 나온다. 대신 목록을 바꾸면 지난 반기의 고객도 따라 바뀐다 — 성적을
// 다시 계산하지는 않으므로(정산 결과는 라운드에 박제돼 있다) 기록이 틀어지지는 않는다.
//
// ── 왜 필요한가 ───────────────────────────────────────────────────
// 지금까지 여덟 반기가 전부 같은 질문이었다: "벤치마크를 이겨라". 고객이 달라지면 같은
// 수익률도 다르게 평가되고(연기금 앞에서는 -5% 가 치명적이고 헤지펀드 앞에서는 초과분만
// 센다), 목표가 달라지면 매번 다른 방식으로 굴려 보게 된다.

/** 이번 반기에 돈을 맡긴 쪽. 정산 계수를 바꾼다. */
export interface SeasonClient {
    id: string;
    name: string;
    /** 화면에 그대로 나가는 한 줄 */
    blurb: string;
    /** 벤치마크 초과에 대한 반응 배수 */
    excess: number;
    /** 절대 손실에 대한 반응 배수 */
    loss: number;
    /** 성과보수 배수 */
    perf: number;
}

export const CLIENTS: SeasonClient[] = [
    {
        id: "pension", name: "보수적 연기금",
        blurb: "잃지 않는 것을 먼저 봅니다. 손실에 두 배로 민감합니다.",
        excess: 0.6, loss: 2, perf: 0.7,
    },
    {
        id: "hedge", name: "헤지펀드 재간접",
        blurb: "벤치마크를 이겼는지만 봅니다. 손실은 덜 따집니다.",
        excess: 1.6, loss: 0.5, perf: 1.5,
    },
    {
        id: "retail", name: "개인 큰손",
        blurb: "성적에 빠르게 반응합니다. 들고 나는 폭이 큽니다.",
        excess: 1.3, loss: 1.3, perf: 1,
    },
    {
        id: "endowment", name: "대학 기금",
        blurb: "천천히 판단합니다. 한 반기 성적으로는 잘 움직이지 않습니다.",
        excess: 0.5, loss: 0.5, perf: 1,
    },
];

/** 이번 반기의 목표. 해내면 회사 자금이 들어온다(도구를 사는 돈이다). */
export interface SeasonMission {
    id: string;
    /** 진행 화면에 한 줄로 나가는 짧은 말 */
    label: string;
    /** 준비·결과 화면의 부연 */
    detail: string;
    /** 달성 보상 (회사 자금) */
    reward: number;
}

/** 목표를 이만큼 앞서야 한다(%p). edge 목표에만 쓴다. */
const EDGE_PCT = 3;
/** 회전율 상한. 이 이하로 이기면 patient 달성. */
const PATIENT_TURNOVER = 1.5;
/** 한때 실었어야 하는 주식 비중(%). */
const FOCUS_EXPOSURE = 70;
/** 담아야 하는 자리 수. */
const SPREAD_SLOTS = 3;

const REWARD = 500_000;

export const MISSIONS: SeasonMission[] = [
    {
        id: "edge", label: `벤치마크 +${EDGE_PCT}%p`,
        detail: `그냥 나눠 담기보다 ${EDGE_PCT}%p 이상 앞섭니다.`,
        reward: REWARD,
    },
    {
        id: "spread", label: `${SPREAD_SLOTS}자리 이상 담고 이기기`,
        detail: `${SPREAD_SLOTS}개 이상의 자리에 담은 채로 벤치마크를 이깁니다. 한 종목에 몰아서는 안 됩니다.`,
        reward: REWARD,
    },
    {
        id: "patient", label: `회전율 ${PATIENT_TURNOVER}배 이하로 이기기`,
        detail: `총 매수대금이 굴린 돈의 ${PATIENT_TURNOVER}배를 넘지 않은 채로 벤치마크를 이깁니다. 자주 사고팔지 않습니다.`,
        reward: REWARD,
    },
    {
        id: "focus", label: `한때 주식 ${FOCUS_EXPOSURE}% 싣고 이기기`,
        detail: `판 도중 한 번은 주식 비중을 ${FOCUS_EXPOSURE}% 이상까지 올린 채로 벤치마크를 이깁니다.`,
        reward: REWARD,
    },
    {
        id: "steady", label: "잃지 않고 이기기",
        detail: "수익률을 0% 아래로 떨어뜨리지 않은 채로 벤치마크를 이깁니다.",
        reward: REWARD,
    },
];

/** 목표 판정에 필요한 것. 전부 반기가 끝날 때 이미 손에 있는 값이다. */
export interface MissionFacts {
    /** 벤치마크 초과(%p) */
    excess: number;
    finalReturn: number;
    /** 총 매수대금 ÷ 굴린 돈. 한 번도 안 샀으면 0 */
    turnover: number | null;
    /** 판 도중 주식 비중의 최고치(%) */
    maxExposure: number;
    /** 한 번이라도 산 자리의 수 */
    slotsUsed: number;
}

export function missionMet(mission: SeasonMission | null, f: MissionFacts): boolean {
    if (!mission) return false;
    const won = f.excess > 0;
    switch (mission.id) {
        case "edge": return f.excess >= EDGE_PCT;
        case "spread": return won && f.slotsUsed >= SPREAD_SLOTS;
        // 한 번도 안 산 반기는 회전율이 0 이다 — 그걸 "참을성"으로 쳐 주면 관망이 목표가 된다.
        case "patient": return won && f.turnover !== null && f.turnover > 0 && f.turnover <= PATIENT_TURNOVER;
        case "focus": return won && f.maxExposure >= FOCUS_EXPOSURE;
        case "steady": return won && f.finalReturn >= 0;
        default: return false;
    }
}

/** 문자열 하나를 32비트로. FNV-1a — 짧고, 두 언어에서 같은 값이 나온다. */
function hash32(s: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

export interface Season {
    client: SeasonClient;
    mission: SeasonMission;
}

/**
 * 이 반기의 고객과 목표.
 *
 * 캠페인이 없는 판(옛 판·체험 운용)에는 없다 — 그때는 예전 규칙 그대로 굴러간다.
 */
export function seasonOf(campaignId?: string | null, halfIndex?: number | null): Season | null {
    if (!campaignId) return null;
    const h = hash32(`${campaignId}:${Math.max(0, Math.floor(Number(halfIndex) || 0))}`);
    return {
        client: CLIENTS[h % CLIENTS.length],
        // 8비트 밀어 고객과 다른 자리를 보게 한다 — 안 그러면 둘이 같이 돌아 짝이 고정된다.
        mission: MISSIONS[(h >>> 8) % MISSIONS.length],
    };
}
