"use client";

// 유동성·거래상태 배지.
// 스크리너는 종목을 네 가지 뷰(비율·카드·데스크탑 표·모바일 표)로 그리는데, 어느 뷰로 보든
// "이 종목을 실제로 담을 수 있는가"는 같은 자리에 같은 모양으로 서야 한다 → 여기 한 곳에 둔다.
//
// 판정 함수 자체는 lib/utils/stockRisk 에 있다 — 프로필 관심 목록과 탄탄함 지수도 같은
// 기준을 쓰기 때문이다. 기존 사용처가 여기서 가져다 쓰고 있으므로 그대로 재수출한다.

import {
    trAmtEok, isHalted, isManaged, isDelisting,
    isCautionAdvised, isOverheated, marketWarn, w52Position, LOW_TR_AMT_EOK,
} from "@/lib/utils/stockRisk";

export {
    trAmtEok, isHalted, isManaged, isDelisting,
    isCautionAdvised, isOverheated, marketWarn, w52Position, LOW_TR_AMT_EOK,
};

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
