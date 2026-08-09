// 모의투자 스냅샷 — 서버(D1)와 localStorage 가 똑같은 모양을 쓴다.
// 화면은 로그인 여부를 신경 쓰지 않고 이 한 가지 모양만 다룬다.

export interface PaperAccount {
    cash: number;
    seed: number;
    realized: number;   // 누적 실현손익
    fees_paid: number;  // 누적 수수료 + 세금
    created_at: number | null;
}

export interface PaperPositionRow {
    ticker: string;
    name: string | null;
    qty: number;
    cost_basis: number;
    // 서버 응답에만 실려 온다(stock_data_daily 조인). 로컬 계좌는 화면에서 시세를 붙인다.
    last_price?: number | null;
    scan_date?: string | null;
    sector?: string | null;
    market?: string | null;
    stat_cls_code?: string | null;
    temp_stop_yn?: string | null;
    mang_issu_cls_code?: string | null;
    sltr_yn?: string | null;
    mrkt_warn_cls_code?: string | null;
}

export interface PaperOrderRow {
    id: number;
    ticker: string;
    name: string | null;
    side: "buy" | "sell";
    qty: number;
    price: number;
    fee: number;
    realized: number | null;  // 매도만
    created_at: number;       // epoch 초
}

export interface PaperSnapshot {
    account: PaperAccount;
    positions: PaperPositionRow[];
    orders: PaperOrderRow[];
}
