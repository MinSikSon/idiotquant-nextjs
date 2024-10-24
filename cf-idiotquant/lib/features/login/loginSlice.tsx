// import { createAppSlice } from "@/lib/createAppSlice";
// import { getMarketInfo, getMarketInfoList, setMarketInfoList } from "./loginAPI";

// interface LoginInfo {
//     state: "init"
//     | "get-rejected"
//     | "loading" | "loaded" | "rejected";
//     id: string;
//     nickName: string;
// }
// const initialState: LoginInfo = {
//     state: "init",
//     id: "",
//     nickName: ""
// }

// export const loginSlice = createAppSlice({
//     name: "login",
//     initialState,
//     reducers: (create) => ({
//         setMarketInfoStateLoading: create.reducer((state) => {
//             state.state = "loading";
//         }),
//         getMarketList: create.asyncThunk(
//             async () => {
//                 return await getMarketInfoList();
//             },
//             {
//                 pending: (state) => {
//                     // console.log(`[getMarketList] pending`);
//                     state.state = "loading";
//                 },
//                 fulfilled: (state, action) => {
//                     // console.log(`[getMarketList] fulfilled`, action.payload, !!action.payload);
//                     if (!!action.payload) {
//                         state.marketInfoList = action.payload;
//                         state.state = "ready-marketInfoList";

//                         const aMarketInfoList = String(action.payload).split(",");
//                         const latestMarketInfoList = aMarketInfoList[aMarketInfoList.length - 1];
//                         const splitLatestMarketInfoList = latestMarketInfoList.replaceAll("\"", "").replaceAll("[", "").replaceAll("]", "").split("_");
//                         const date = splitLatestMarketInfoList[1];

//                         state.latestDate = date;
//                     }
//                     else {
//                         state.state = "get-rejected";
//                     }
//                 },
//                 rejected: (state) => {
//                     // console.log(`[getMarketList] rejected`);
//                     state.state = "get-rejected";
//                 }
//             }
//         ),
//         setMarketList: create.asyncThunk(
//             async (dateList: string[]) => { return await setMarketInfoList(dateList); },
//             {
//                 pending: (state) => { state.state = "loading"; },
//                 fulfilled: (state, action) => {
//                     state.marketInfoList = action.payload;
//                     state.state = "ready-marketInfoList";
//                 },
//                 rejected: (state) => { state.state = "rejected"; }
//             }
//         ),
//         initMarketInfo: create.asyncThunk(
//             async ({ date }: { date: string }) => {
//                 // console.log(`[initMarketInfo]`, date);
//                 const res: any = await getMarketInfo(date); // 20230426
//                 return res;
//             },
//             {
//                 pending: (state) => {
//                     // console.log(`[initMarketInfo] pending`);
//                     state.state = "loading";
//                 },
//                 fulfilled: (state, action) => {
//                     // console.log(`[initMarketInfo] fulfilled`, action.payload);
//                     state.state = "ready-marketInfo";
//                     state.loaded = true;
//                     state.value = action.payload;
//                 },
//                 rejected: (state) => {
//                     console.log(`[initMarketInfo] rejected`);
//                     state.state = "rejected";
//                 }
//             }
//         )
//     }),
//     selectors: {
//         selectMarketInfoLoaded: (state) => state.loaded,
//         selectMarketInfoState: (state) => state.state,
//         selectMarketInfoList: (state) => state.marketInfoList,
//         selectMarketInfoLatestDate: (state) => state.latestDate,
//         selectMarketInfo: (state) => state.value,
//     }
// });


// export const { setMarketInfoStateLoading } = marketInfoSlice.actions;
// export const { initMarketInfo } = marketInfoSlice.actions;
// export const { getMarketList, setMarketList } = marketInfoSlice.actions;
// export const { selectMarketInfo, selectMarketInfoList, selectMarketInfoLoaded, selectMarketInfoState } = marketInfoSlice.selectors;
// export const { selectMarketInfoLatestDate } = marketInfoSlice.selectors;
