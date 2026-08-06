"use client";

// 유동성·거래상태 표시.
// 스크리너는 종목을 네 가지 뷰(비율·카드·데스크탑 표·모바일 표)로 그리는데, 어느 뷰로 보든
// "이 종목을 실제로 담을 수 있는가"는 같은 자리에 같은 모양으로 서야 한다 → 여기 한 곳에 둔다.
// 판정 함수도 같이 두어 필터와 배지가 다른 기준을 쓰는 일이 없게 한다.
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

/** 시장경고 등급 — 없으면 null. */
export function marketWarn(i: any): "투자주의" | "투자경고" | "투자위험" | null {
    const code = String(i?.mrkt_warn_cls_code ?? "").trim();
    if (code === "01") return "투자주의";
    if (code === "02") return "투자경고";
    if (code === "03") return "투자위험";
    return null;
}

/** 하루 거래대금이 이보다 적으면 원하는 수량을 한 번에 담기 어렵다 */
export const LOW_TR_AMT_EOK = 3;

// 정상 종목에는 아무것도 붙이지 않는다 — 모든 행에 배지가 달리면 신호가 아니라 잡음이 된다.
// 표에 열을 새로 만들지 않은 이유: 데스크탑 표는 이미 7열 고정폭이라 한 열을 더하면 좁은
// 노트북에서 눌리고, 카드 뷰에는 그 열이 아예 없어 같은 정보가 한쪽에만 생긴다.
const ROSE = "px-1.5 py-0.5 rounded text-[9.5px] font-black bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 whitespace-nowrap";
const AMBER = "px-1.5 py-0.5 rounded text-[9.5px] font-black bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 whitespace-nowrap";

export function LiquidityBadge({ item }: { item: any }) {
    // 심각한 것 하나만 보여준다. 배지를 여러 개 달면 좁은 화면에서 종목명을 밀어낸다.
    // 순서 = 심각도. 정리매매가 맨 앞인 이유는 되돌릴 수 없는 유일한 상태이기 때문이다.
    if (isDelisting(item)) return <span className={ROSE} title="상장폐지가 확정되어 정리매매 중입니다">정리매매</span>;
    if (isHalted(item)) return <span className={ROSE}>거래정지</span>;
    if (isManaged(item)) return <span className={ROSE}>관리종목</span>;

    const warn = marketWarn(item);
    // 투자주의(01)는 흔해서 배지로 달면 목록 절반에 붙는다 — 경고·위험만 드러낸다.
    if (warn === "투자경고" || warn === "투자위험") {
        return <span className={ROSE}>{warn}</span>;
    }

    if (isCautionAdvised(item)) return <span className={AMBER}>투자유의</span>;
    if (isOverheated(item)) return <span className={AMBER} title="단기과열 지정 — 주가가 단기간에 급등한 상태입니다">단기과열</span>;

    const v = trAmtEok(item);
    if (v === null || v >= LOW_TR_AMT_EOK) return null;
    return (
        <span
            title={`하루 거래대금 약 ${v.toFixed(1)}억원 — 원하는 수량을 한 번에 담기 어렵습니다`}
            className={AMBER}
        >
            거래 {v.toFixed(1)}억
        </span>
    );
}
