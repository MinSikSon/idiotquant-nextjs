// 종목 거래상태·위험 판정 (순수 함수).
//
// 화면 컴포넌트가 아니라 여기 있는 이유: 스크리너 배지, 프로필 관심 목록, 포트폴리오
// 탄탄함 지수가 모두 같은 기준을 써야 한다. 한 종목이 어떤 화면에서는 관리종목이고
// 다른 화면에서는 아니면, 어느 쪽을 믿어야 할지 알 수 없다.
//
// KIS 코드표 (공식 저장소 open-trading-api 컬럼 매핑 + 스펙 미러 기준)
//   iscd_stat_cls_code : 00 그외 / 51 관리종목 / 52 투자의견 / 53 투자경고 / 54 투자주의
//                        55 신용가능 / 57 증거금 100% / 58 거래정지 / 59 단기과열
//   mrkt_warn_cls_code : 00 없음 / 01 투자주의 / 02 투자경고 / 03 투자위험
//
// ⚠️ iscd_stat_cls_code 는 종목당 값이 하나뿐이다. 관리종목이면서 신용가능인 종목은 51 과 55
//    중 하나만 실려 온다 → 관리종목 판정은 전용 플래그(mang_issu_cls_code)를 우선 본다.

/** 누적 거래대금(원) → 억원. 값이 없으면 null — "거래대금 0원"과 "아직 수집 안 됨"은 다르다. */
export function trAmtEok(i: any): number | null {
    const v = i?.acml_tr_pbmn;
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n / 1e8 : null;
}

/** KIS 의 Y/N 플래그. 값 도메인을 단정하지 않으므로 'Y' 만 참으로 본다. */
function isY(v: any): boolean {
    return String(v ?? "").trim().toUpperCase() === "Y";
}

const statCode = (i: any) => String(i?.stat_cls_code ?? "").trim();

/**
 * 지금 매매할 수 없는 상태.
 * temp_stop_yn 은 원래 이름이 "임시 정지 여부"라 이것만으로 "거래정지"라 부르면 넓게 읽힌다
 * — 실제 매매거래정지(58)를 함께 본다. 사용자에게는 둘 다 "지금 못 산다"로 같은 뜻이다.
 */
export function isHalted(i: any): boolean {
    return statCode(i) === "58" || isY(i?.temp_stop_yn);
}

/** 관리종목. 전용 플래그가 없던 시절 데이터를 위해 stat_cls_code 51 도 함께 본다. */
export function isManaged(i: any): boolean {
    return isY(i?.mang_issu_cls_code) || statCode(i) === "51";
}

/**
 * 정리매매 — 상장폐지가 확정되어 마지막 매매 기간에 들어간 종목.
 * NCAV 스크리너에서 특히 위험하다: 폐지가 정해지면 주가가 먼저 무너지므로 청산가치 대비
 * 극단적으로 싸 보이고, 그래서 상위에 올라온다. 회수 가능한 싼 값이 아니라 없어지는 값이다.
 */
export function isDelisting(i: any): boolean {
    return isY(i?.sltr_yn);
}

/** 투자유의 — 거래소가 붙이는 주의 환기. */
export function isCautionAdvised(i: any): boolean {
    return isY(i?.invt_caful_yn);
}

/** 단기과열 — 전용 플래그가 없으면 stat_cls_code 59 로 떨어진다. */
export function isOverheated(i: any): boolean {
    return isY(i?.short_over_yn) || statCode(i) === "59";
}

/** 시장경고 등급 — 없으면 null. */
export function marketWarn(i: any): "투자주의" | "투자경고" | "투자위험" | null {
    const code = String(i?.mrkt_warn_cls_code ?? "").trim();
    if (code === "01") return "투자주의";
    if (code === "02") return "투자경고";
    if (code === "03") return "투자위험";
    return null;
}

/**
 * 52주 구간에서 현재가가 선 위치(0=저점, 100=고점). 값이 없거나 구간이 0이면 null.
 * 저점 근처는 "싸다"가 아니라 "덜 올랐다"는 뜻일 뿐이라, 판단이 아니라 위치만 돌려준다.
 */
export function w52Position(i: any): number | null {
    const hi = Number(i?.w52_hgpr);
    const lo = Number(i?.w52_lwpr);
    const px = Number(i?.last_price);
    if (![hi, lo, px].every(Number.isFinite)) return null;
    if (hi <= lo || px <= 0) return null;
    // 장중 신고가/신저가면 구간을 벗어날 수 있다 — 0~100 으로 눕힌다
    return Math.max(0, Math.min(100, ((px - lo) / (hi - lo)) * 100));
}

/** 하루 거래대금이 이보다 적으면 원하는 수량을 한 번에 담기 어렵다 */
export const LOW_TR_AMT_EOK = 3;
