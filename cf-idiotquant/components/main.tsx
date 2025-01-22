// import TablePanel, { ListNodeTemplate } from "@/components/TablePanel";
// import { selectMarketInfoLatestDate } from "@/lib/features/marketInfo/marketInfoSlice";
// import { selectNcavList } from "@/lib/features/strategy/strategySlice";
// import { useAppSelector } from "@/lib/hooks";

// export const Ticker = () => {
//     const bsnsDate = useAppSelector(selectMarketInfoLatestDate);
//     const filteredStocks = useAppSelector(selectNcavList);
//     // console.log(`[Home] filteredStocks`, filteredStocks,`, bsnsDate`, bsnsDate);

//     return <>
//         <TablePanel
//             listHeader={<ListNodeTemplate
//                 link={`/`}
//                 item1={"종목명"}
//                 item2={"현재가"}
//                 item3={"➡️"}
//                 item4={"목표가"}
//                 color={"blue"}
//                 bgColor={"bg-gray-200"}
//             />}
//             loadingMsg={"loading"}

//             pathname={`ticker`}
//             marqueueDisplay={true}

//             filteredStocks={filteredStocks}
//             bsnsDate={bsnsDate}
//         />
//     </>;
// }