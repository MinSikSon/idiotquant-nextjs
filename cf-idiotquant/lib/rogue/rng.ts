/**
 * 시드 난수 — 한 판의 모든 무작위가 여기서 나온다.
 *
 * 시드를 쓰는 이유는 재현이다. 층 생성이 이상하면 그 시드로 다시 만들어 볼 수 있어야
 * 하고, 테스트가 "같은 시드는 같은 층" 을 붙잡을 수 있어야 한다. `Math.random` 을
 * 엔진 안에서 부르지 말 것 — 부르는 순간 그 자리는 다시 못 본다.
 *
 * mulberry32. 32비트 상태 하나짜리라 저장·복원이 숫자 한 개다.
 */
export class Rng {
    private s: number;

    constructor(seed: number) {
        // 0 은 고정점이라 영영 0 을 낸다.
        this.s = (seed >>> 0) || 0x9e3779b9;
    }

    /** 다음 난수 [0, 1). */
    next(): number {
        this.s = (this.s + 0x6d2b79f5) >>> 0;
        let t = this.s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /** Rogue 의 `rnd(n)` — 0 이상 n 미만. n 이 0 이하면 0. */
    rnd(n: number): number {
        return n <= 0 ? 0 : Math.floor(this.next() * n);
    }

    /** 주사위 — `roll(2, 4)` 는 2d4. 다면체는 전부 이 함수를 지난다. */
    roll(count: number, sides: number): number {
        let sum = 0;
        for (let i = 0; i < count; i++) sum += this.rnd(sides) + 1;
        return sum;
    }

    /** `"2d4"` 같은 주사위 표기를 굴린다. */
    rollDice(spec: string): number {
        const m = /^(\d+)d(\d+)$/.exec(spec.trim());
        if (!m) return 0;
        return this.roll(Number(m[1]), Number(m[2]));
    }

    /** lo 이상 hi 이하의 정수. */
    between(lo: number, hi: number): number {
        return hi <= lo ? lo : lo + this.rnd(hi - lo + 1);
    }

    /** 확률 p (0~1) 로 참. */
    chance(p: number): boolean {
        return this.next() < p;
    }

    /** 배열에서 하나. 빈 배열이면 undefined. */
    pick<T>(arr: readonly T[]): T | undefined {
        return arr.length === 0 ? undefined : arr[this.rnd(arr.length)];
    }

    /** 제자리에서 섞는다 (Fisher-Yates). */
    shuffle<T>(arr: T[]): T[] {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = this.rnd(i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /** 저장·복원용 상태. */
    get state(): number {
        return this.s;
    }
    set state(v: number) {
        this.s = v >>> 0;
    }
}

/** 주사위 표기의 최댓값 — 표를 훑어 세기용. */
export function maxOfDice(spec: string): number {
    const m = /^(\d+)d(\d+)$/.exec(spec.trim());
    return m ? Number(m[1]) * Number(m[2]) : 0;
}
