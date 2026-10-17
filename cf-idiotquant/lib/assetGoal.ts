/** 목표와 현재 금액은 호출하는 화면에서 같은 단위로 전달한다. */
export function assetGoalProgress(current: number, target: number) {
    if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(current)) return null;
    return {
        percent: Math.max(0, current / target * 100),
        remaining: Math.max(0, target - current),
        reached: current >= target,
    };
}
