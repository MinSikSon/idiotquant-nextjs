"use client";

// 전투 효과음 — 외부 오디오 에셋 없이 WebAudio 오실레이터로 즉석 합성하는 레트로 게임 사운드.
// 모든 호출은 유저 제스처(버튼 탭) 핸들러 안에서 일어나므로 AudioContext resume 제약과 충돌하지
// 않는다. SSR/미지원 브라우저/음소거 상태에선 전부 조용히 no-op.

const MUTE_KEY = "iq:game:muted";

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => { });
  return ctx;
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return true;
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}
export function setMuted(muted: boolean) {
  try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch { }
}

type ToneOpts = {
  type?: OscillatorType;
  vol?: number;
  slideTo?: number; // 지정하면 재생 동안 주파수가 이 값까지 미끄러짐(타격 낙하음 등)
  delay?: number;   // 초 단위 시작 지연(아르페지오 구성용)
};
function tone(freq: number, dur: number, { type = "square", vol = 0.035, slideTo, delay = 0 }: ToneOpts = {}) {
  if (isMuted()) return;
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// 이벤트별 사운드 — 전부 짧은(0.1~0.5초) 레트로 톤 조합.
export const sfx = {
  attack() { tone(220, 0.12, { type: "square", slideTo: 90 }); },                       // 타격 — 낮게 떨어지는 펀치음
  crit() { tone(330, 0.09, { slideTo: 120 }); tone(520, 0.14, { delay: 0.05, slideTo: 200, vol: 0.045 }); }, // 크리티컬 — 두 겹 강타
  shield() { tone(150, 0.16, { type: "triangle", vol: 0.05 }); },                        // 방어 — 둔탁한 저음
  heal() { [392, 523, 659].forEach((f, i) => tone(f, 0.12, { type: "triangle", delay: i * 0.07 })); }, // 회복 — 올라가는 3음
  hurt() { tone(180, 0.16, { type: "sawtooth", slideTo: 70, vol: 0.04 }); },             // 피격 — 거친 하강음
  faint() { tone(300, 0.45, { type: "sawtooth", slideTo: 40, vol: 0.045 }); },           // 기절 — 길게 무너지는 음
  status() { tone(500, 0.07, { type: "square" }); tone(380, 0.09, { delay: 0.08 }); },   // 상태이상 — 삐빅 경고
  levelup() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.11, { delay: i * 0.08, vol: 0.045 })); }, // 레벨업 팡파르
  victory() { [523, 523, 784].forEach((f, i) => tone(f, i === 2 ? 0.3 : 0.1, { delay: i * 0.11, vol: 0.045 })); }, // 승리 3음
  flee() { tone(600, 0.2, { type: "triangle", slideTo: 1200 }); },                       // 도망 — 위로 슝
};
