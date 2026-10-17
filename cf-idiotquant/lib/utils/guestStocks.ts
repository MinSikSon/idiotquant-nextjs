/** 홈과 비로그인 스크리너에서 공통으로 사용하는 발굴 조건. */
export function matchesGuestPer(item: { per?: number | null }): boolean {
    return typeof item.per === "number" && Number.isFinite(item.per) && item.per > 0 && item.per <= 20;
}
