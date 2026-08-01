import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";

interface Control {
    value: number;
    stockCount: number;
    realRateOfReturn: number;
    theme: "light" | "dark";
}
const initialState: Control = {
    value: 0,
    stockCount: 0,
    realRateOfReturn: 0,
    // 기본값은 다크 — layout.tsx 선반영 스크립트 / ThemeProviderClient / navigation.tsx가
    // 모두 "저장값이 light일 때만 라이트"라는 같은 기준을 쓴다. 하나라도 어긋나면
    // 첫 마운트에서 테마가 한 번 뒤집히고 그 값이 localStorage에 굳는다.
    theme: "dark",

}
export const controlSlice = createAppSlice({
    name: "control",
    initialState,
    reducers: (create) => ({
        setTheme: create.reducer<"light" | "dark">((state, action: PayloadAction<"light" | "dark">) => {
            state.theme = action.payload;
        }),
    }),
    selectors: {
        selectTheme: (counter) => counter.theme,
    }
})

export const { setTheme } = controlSlice.actions;
export const { selectTheme } = controlSlice.selectors;