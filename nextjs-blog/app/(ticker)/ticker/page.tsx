// "use client"

// import TablePanel from "@/components/TablePanel";
// import { selectMarketInfoLatestDate } from "@/lib/features/marketInfo/marketInfoSlice";
// import { selectNcavList } from "@/lib/features/strategy/strategySlice";
// import { useAppSelector } from "@/lib/hooks";
// import React from "react";

// export default function Stock() {
//     const bsnsDate = useAppSelector(selectMarketInfoLatestDate);
//     const filteredStocksList = useAppSelector(selectNcavList);
//     return <>
//         <TablePanel
//             marqueueDisplay={true}

//             arrayFilteredStocksList={Object.keys(filteredStocksList)}
//             latestStockCompanyInfo={filteredStocksList}
//             marketInfoList={filteredStocksList}
//             bsnsDate={bsnsDate}
//         />
//     </>;
// }
