// 저평가 점수 (게임 스코어 + 데이터 정제)
// NCAV·PBR·PER·ROE 기준을 각각 0~1 서브점수로 환산해 가중 평균한 뒤 0~100 점수로.
// 데이터가 없는 지표는 제외하고 남은 지표의 가중치로 정규화한다.

export type ValueTone = "legend" | "treasure" | "diamond" | "gold" | "silver" | "bronze" | "iron" | "raw" | "clay" | "explore";

// 점수 계산 내역 (지표별 서브점수·가중치) — 게임 종료 시 계산 과정 표시용
export interface ValuePart {
  key: "ncav" | "pbr" | "per" | "roe";
  label: string;          // "NCAV" 등
  weight: number;         // 명목 가중치 (0~1)
  available: boolean;     // 데이터 유무
  valueStr: string;       // 원시값 표기 ("0.85x" / "—")
  sub: number;            // 0~1 서브점수 (없으면 0) — 등급 산정용. 정규화 구간 밖(예: NCAV 0~0.3, PBR>1.5)은
                           // 전부 0(또는 1)으로 뭉개져서 그 안에서는 값 차이가 사라짐 — 카드 등급용으로는
                           // 문제없지만 배틀 승패 비교에는 부적합(아래 raw/higherBetter 참고).
  raw: number;            // 정규화 전 원시값(NaN 가능) — 배틀 승패는 이 값을 그대로 비교(뭉개짐 없음)
  higherBetter: boolean;  // 이 지표는 raw가 클수록 유리한지(NCAV·ROE=true, PBR·PER=false)
}

export interface ValueScore {
  score: number;          // 0~100
  grade: "SS" | "S" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
  medal: string;          // 이모지
  label: string;          // 등급 한글
  tone: ValueTone;
  parts: ValuePart[];     // 계산 내역 (ncav·pbr·per·roe 순)
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const num = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : NaN;
};

export function computeValueScore(item: any): ValueScore {
  const ncav = num(item?.ncav_ratio);
  const pbr = num(item?.pbr);
  const per = num(item?.per);
  const eps = num(item?.eps);
  const bps = num(item?.bps);
  const roe = bps > 0 && Number.isFinite(eps) ? (eps / bps) * 100 : NaN;

  // 값이 존재하면(finite) 계산에 포함. 음수/0(적자 PER·음수 PBR·자본잠식 등)은 "제외"가 아니라
  // 서브점수 0으로 페널티 — 나쁜 펀더멘털이 빠지면서 점수가 부풀려지는 문제를 막는다.
  // 값이 아예 없을(NaN) 때만 제외하고 남은 가중치로 정규화한다.
  const parts: ValuePart[] = [
    {
      key: "ncav", label: "NCAV", weight: 0.40,               // 1.5x↑ 만점
      available: Number.isFinite(ncav),
      sub: ncav > 0 ? clamp01((ncav - 0.3) / (1.5 - 0.3)) : 0,
      raw: ncav, higherBetter: true,                          // 음수도 그대로 비교(높을수록 유리라 자연스럽게 정렬됨)
      valueStr: Number.isFinite(ncav) ? `${ncav.toFixed(2)}x` : "—",
    },
    {
      key: "pbr", label: "PBR", weight: 0.25,                 // 0.3↓ 만점, 음수(자본잠식)는 0점
      available: Number.isFinite(pbr),
      sub: pbr > 0 ? clamp01((1.5 - pbr) / (1.5 - 0.3)) : 0,
      raw: pbr > 0 ? pbr : Infinity, higherBetter: false,     // 0 이하(자본잠식)는 "낮을수록 유리"에서 항상 지도록 +∞로
      valueStr: Number.isFinite(pbr) ? pbr.toFixed(2) : "—",
    },
    {
      key: "per", label: "PER", weight: 0.20,                 // 5↓ 만점, 적자(음수)는 0점
      available: Number.isFinite(per),
      sub: per > 0 ? clamp01((20 - per) / (20 - 5)) : 0,
      raw: per > 0 ? per : Infinity, higherBetter: false,     // 0 이하(적자)는 항상 지도록 +∞로
      valueStr: Number.isFinite(per) ? per.toFixed(1) : "—",
    },
    {
      key: "roe", label: "ROE", weight: 0.15,                 // 18%↑ 만점, 자본잠식(bps≤0)·적자는 0점
      available: Number.isFinite(eps) && Number.isFinite(bps) && bps !== 0,
      sub: bps > 0 ? clamp01((roe - 3) / (18 - 3)) : 0,
      raw: bps > 0 ? roe : -Infinity, higherBetter: true,     // 자본잠식(bps<0)은 항상 지도록 -∞로
      valueStr: bps > 0 ? `${roe.toFixed(1)}%` : (Number.isFinite(bps) && bps < 0 ? "자본잠식" : "—"),
    },
  ];

  const avail = parts.filter(p => p.available);
  const wsum = avail.reduce((a, p) => a + p.weight, 0);
  const score = wsum > 0 ? Math.round((avail.reduce((a, p) => a + p.weight * p.sub, 0) / wsum) * 100) : 0;

  return { score, ...tier(score), parts };
}

function tier(score: number): Omit<ValueScore, "score" | "parts"> {
  if (score >= 90) return { grade: "SS", medal: "👑", label: "전설", tone: "legend" };
  if (score >= 80) return { grade: "S", medal: "🏆", label: "보물", tone: "treasure" };
  if (score >= 70) return { grade: "A", medal: "💎", label: "다이아", tone: "diamond" };
  if (score >= 62) return { grade: "B", medal: "🥇", label: "금", tone: "gold" };
  if (score >= 54) return { grade: "C", medal: "🥈", label: "은", tone: "silver" };
  if (score >= 46) return { grade: "D", medal: "🥉", label: "동", tone: "bronze" };
  if (score >= 38) return { grade: "E", medal: "🔩", label: "철", tone: "iron" };
  if (score >= 30) return { grade: "F", medal: "🪨", label: "원석", tone: "raw" };
  if (score >= 20) return { grade: "G", medal: "🟤", label: "흙", tone: "clay" };
  return { grade: "H", medal: "🧭", label: "탐색", tone: "explore" };
}
