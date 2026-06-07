import { createAppSlice } from "@/lib/createAppSlice";
import { getMyLikes, toggleLike } from "./stockLikesAPI";

export interface LikedStockItem {
    ticker: string;
    stock_name: string | null;
    is_us: number;
    added_at: number;
    strategies: string[];
    ncav_ratio: number | null;
    per: number | null;
    pbr: number | null;
    eps: number | null;
    bps: number | null;
    roe: number | null;
    last_price: number | null;
    market_cap: number | null;
    scan_date: string | null;
    current_assets: number | null;
    total_liabilities: number | null;
    net_income: number | null;
}

interface StockLikesState {
    state: "init" | "pending" | "fulfilled" | "rejected";
    likedTickers: string[];
    likedList: LikedStockItem[];
    togglePending: string[];
}

const initialState: StockLikesState = {
    state: "init",
    likedTickers: [],
    likedList: [],
    togglePending: [],
};

export const stockLikesSlice = createAppSlice({
    name: "stockLikes",
    initialState,
    reducers: (create) => ({
        reqGetMyLikes: create.asyncThunk(
            async () => {
                const result = await getMyLikes();
                if (result?.success === false) throw new Error(result?.error ?? "API error");
                return result;
            },
            {
                pending: (state) => { state.state = "pending"; },
                fulfilled: (state, action) => {
                    const data: LikedStockItem[] = action.payload?.data ?? [];
                    state.likedList = data;
                    state.likedTickers = data.map((item) => item.ticker);
                    state.state = "fulfilled";
                },
                rejected: (state) => { state.state = "rejected"; },
            }
        ),
        reqToggleLike: create.asyncThunk(
            async (payload: { ticker: string; name?: string; isUs?: boolean }) => {
                const result = await toggleLike(payload.ticker, payload.name, payload.isUs);
                if (result?.success === false) throw new Error(result?.error ?? "API error");
                return { ticker: payload.ticker, liked: result.liked as boolean, name: payload.name, isUs: payload.isUs };
            },
            {
                pending: (state, action) => {
                    const ticker = action.meta.arg.ticker;
                    if (!state.togglePending.includes(ticker)) {
                        state.togglePending.push(ticker);
                    }
                    // optimistic update
                    if (state.likedTickers.includes(ticker)) {
                        state.likedTickers = state.likedTickers.filter((t) => t !== ticker);
                        state.likedList = state.likedList.filter((item) => item.ticker !== ticker);
                    } else {
                        state.likedTickers = [...state.likedTickers, ticker];
                    }
                },
                fulfilled: (state, action) => {
                    const { ticker, liked, name, isUs } = action.payload;
                    state.togglePending = state.togglePending.filter((t) => t !== ticker);
                    // reconcile with server truth
                    if (liked) {
                        if (!state.likedTickers.includes(ticker)) {
                            state.likedTickers = [...state.likedTickers, ticker];
                        }
                        if (!state.likedList.find((item) => item.ticker === ticker)) {
                            state.likedList = [
                                {
                                    ticker,
                                    stock_name: name ?? null,
                                    is_us: isUs ? 1 : 0,
                                    added_at: Math.floor(Date.now() / 1000),
                                    strategies: [],
                                    ncav_ratio: null, per: null, pbr: null,
                                    eps: null, bps: null, roe: null,
                                    last_price: null, market_cap: null,
                                    scan_date: null, current_assets: null,
                                    total_liabilities: null, net_income: null,
                                },
                                ...state.likedList,
                            ];
                        }
                    } else {
                        state.likedTickers = state.likedTickers.filter((t) => t !== ticker);
                        state.likedList = state.likedList.filter((item) => item.ticker !== ticker);
                    }
                },
                rejected: (state, action) => {
                    const ticker = action.meta.arg.ticker;
                    state.togglePending = state.togglePending.filter((t) => t !== ticker);
                    // revert optimistic update by re-fetching
                    // (slice doesn't revert automatically; caller can dispatch reqGetMyLikes)
                },
            }
        ),
    }),
    selectors: {
        selectLikedTickers: (state) => state.likedTickers,
        selectLikedList: (state) => state.likedList,
        selectLikesState: (state) => state.state,
        selectIsLiked: (state, ticker: string) => state.likedTickers.includes(ticker),
        selectTogglePending: (state) => state.togglePending,
    },
});

export const { reqGetMyLikes, reqToggleLike } = stockLikesSlice.actions;
export const {
    selectLikedTickers,
    selectLikedList,
    selectLikesState,
    selectIsLiked,
    selectTogglePending,
} = stockLikesSlice.selectors;
