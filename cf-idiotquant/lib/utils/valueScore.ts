// 저평가 점수 (게임 스코어 + 데이터 정제)
// NCAV·PBR·PER·ROE 기준을 각각 0~1 서브점수로 환산해 가중 평균한 뒤 0~100 점수로.
// 데이터가 없는 지표는 제외하고 남은 지표의 가중치로 정규화한다.

export type ValueTone = "treasure" | "gold" | "silver" | "bronze" | "muted";

export interface ValueScore {
  score: number;          // 0~100
  grade: "S" | "A" | "B" | "C" | "D";
  medal: string;          // 이모지
  label: string;          // 등급 한글
  tone: ValueTone;
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

  // { 가중치, 서브점수(0~1) }
  const parts: { w: number; s: number }[] = [];
  if (Number.isFinite(ncav) && ncav > 0) parts.push({ w: 0.40, s: clamp01((ncav - 0.3) / (1.5 - 0.3)) }); // NCAV 1.5x↑ 만점
  if (Number.isFinite(pbr) && pbr > 0) parts.push({ w: 0.25, s: clamp01((1.5 - pbr) / (1.5 - 0.3)) });     // PBR 0.3↓ 만점
  if (Number.isFinite(per) && per > 0) parts.push({ w: 0.20, s: clamp01((20 - per) / (20 - 5)) });         // PER 5↓ 만점
  if (Number.isFinite(roe)) parts.push({ w: 0.15, s: clamp01((roe - 3) / (18 - 3)) });                     // ROE 18%↑ 만점

  const wsum = parts.reduce((a, p) => a + p.w, 0);
  const score = wsum > 0 ? Math.round((parts.reduce((a, p) => a + p.w * p.s, 0) / wsum) * 100) : 0;

  return { score, ...tier(score) };
}

function tier(score: number): Omit<ValueScore, "score"> {
  if (score >= 80) return { grade: "S", medal: "🏆", label: "보물", tone: "treasure" };
  if (score >= 65) return { grade: "A", medal: "🥇", label: "금", tone: "gold" };
  if (score >= 50) return { grade: "B", medal: "🥈", label: "은", tone: "silver" };
  if (score >= 35) return { grade: "C", medal: "🥉", label: "동", tone: "bronze" };
  return { grade: "D", medal: "🧭", label: "탐색", tone: "muted" };
}
