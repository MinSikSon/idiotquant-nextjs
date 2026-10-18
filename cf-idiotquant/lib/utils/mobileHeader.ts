/** 헤더 높이가 줄어 스크롤 위치가 조금 변해도 펼침/접힘이 반복되지 않게 한다. */
export function nextMobileHeaderCompact(compact: boolean, scrollY: number, mobile: boolean): boolean {
    if (!mobile || scrollY <= 24) return false;
    return compact || scrollY >= 128;
}
