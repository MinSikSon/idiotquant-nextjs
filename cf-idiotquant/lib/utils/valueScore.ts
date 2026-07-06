// 저평가 점수 (게임 스코어 + 데이터 정제)
// NCAV·PBR·PER·ROE 기준을 각각 0~1 서브점수로 환산해 가중 평균한 뒤 0~100 점수로.
// 데이터가 없는 지표는 제외하고 남은 지표의 가중치로 정규화한다.

export type ValueTone = "legend" | "treasure" | "diamond" | "gold" | "silver" | "bronze" | "raw" | "explore";

// 점수 계산 내역 (지표별 서브점수·가중치) — 게임 종료 시 계산 과정 표시용
export interface ValuePart {
  key: "ncav" | "pbr" | "per" | "roe";
  label: string;          // "NCAV" 등
  weight: number;         // 명목 가중치 (0~1)
  available: boolean;     // 데이터 유무
  valueStr: string;       // 원시값 표기 ("0.85x" / "—")
  sub: number;            // 0~1 서브점수 (없으면 0)
}

export interface ValueScore {
  score: number;          // 0~100
  grade: "S+" | "S" | "A+" | "A" | "B+" | "B" | "C" | "D";
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

function mkPart(
  key: ValuePart["key"], label: string, weight: number,
  value: number, available: boolean, sub: number, fmt: (v: number) => string,
): ValuePart {
  return { key, label, weight, available, sub: available ? sub : 0, valueStr: available ? fmt(value) : "—" };
}

export function computeValueScore(item: any): ValueScore {
  const ncav = num(item?.ncav_ratio);
  const pbr = num(item?.pbr);
  const per = num(item?.per);
  const eps = num(item?.eps);
  const bps = num(item?.bps);
  const roe = bps > 0 && Number.isFinite(eps) ? (eps / bps) * 100 : NaN;

  const parts: ValuePart[] = [
    mkPart("ncav", "NCAV", 0.40, ncav, Number.isFinite(ncav) && ncav > 0, clamp01((ncav - 0.3) / (1.5 - 0.3)), v => `${v.toFixed(2)}x`), // 1.5x↑ 만점
    mkPart("pbr", "PBR", 0.25, pbr, Number.isFinite(pbr) && pbr > 0, clamp01((1.5 - pbr) / (1.5 - 0.3)), v => v.toFixed(2)),             // 0.3↓ 만점
    mkPart("per", "PER", 0.20, per, Number.isFinite(per) && per > 0, clamp01((20 - per) / (20 - 5)), v => v.toFixed(1)),                 // 5↓ 만점
    mkPart("roe", "ROE", 0.15, roe, Number.isFinite(roe), clamp01((roe - 3) / (18 - 3)), v => `${v.toFixed(1)}%`),                       // 18%↑ 만점
  ];

  // 값 없는 지표는 제외하고 남은 지표의 가중치로 정규화
  const avail = parts.filter(p => p.available);
  const wsum = avail.reduce((a, p) => a + p.weight, 0);
  const score = wsum > 0 ? Math.round((avail.reduce((a, p) => a + p.weight * p.sub, 0) / wsum) * 100) : 0;

  return { score, ...tier(score), parts };
}

function tier(score: number): Omit<ValueScore, "score" | "parts"> {
  if (score >= 90) return { grade: "S+", medal: "👑", label: "전설", tone: "legend" };
  if (score >= 80) return { grade: "S", medal: "🏆", label: "보물", tone: "treasure" };
  if (score >= 70) return { grade: "A+", medal: "💎", label: "다이아", tone: "diamond" };
  if (score >= 60) return { grade: "A", medal: "🥇", label: "금", tone: "gold" };
  if (score >= 50) return { grade: "B+", medal: "🥈", label: "은", tone: "silver" };
  if (score >= 40) return { grade: "B", medal: "🥉", label: "동", tone: "bronze" };
  if (score >= 25) return { grade: "C", medal: "🪨", label: "원석", tone: "raw" };
  return { grade: "D", medal: "🧭", label: "탐색", tone: "explore" };
}
