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
    if (isHalted(item)) return <span className={ROSE}>거래정지</span>;
    if (isManaged(item)) return <span className={ROSE}>관리종목</span>;

    const warn = marketWarn(item);
    // 투자주의(01)는 흔해서 배지로 달면 목록 절반에 붙는다 — 경고·위험만 드러낸다.
    if (warn === "투자경고" || warn === "투자위험") {
        return <span className={ROSE}>{warn}</span>;
    }

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
