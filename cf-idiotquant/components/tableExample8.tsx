import React from "react";
import { DesignButton } from "./designButton";
import { Box, Button, Flex, Spinner, Text } from "@radix-ui/themes";

const DEBUG = false;

export interface Example8TableRowType {
    id: any;
    column_1?: any;
    column_2: any;
    column_3: any;
    column_4: any;
    expectedRateOfReturnColor?: any;
    column_5?: any;
    column_6: any;
    column_7?: any;
    column_8?: any;
    column_9?: any;
    column_10?: any;
    column_11?: any;
    column_12?: any;
    bgColor?: any;
    column_13?: any;
    column_14?: any;
    column_15?: any;
    column_16?: any;
}

export interface Example8TableHeadType {
    head: string;
    desc?: string;
    customeStyle?: string;
}

export interface TablesExample8PropsType {
    title: any;
    msg?: any;
    desc: any;
    financial_date?: any;
    market_date?: any;
    tableHead: Example8TableHeadType[];
    selectHead?: any;
    setSelectHead?: any;
    prevSelectHead?: any;
    setPrevSelectHead?: any;
    tableRow: Example8TableRowType[];
    visibleCount?: any;
    setVisibleCount?: any;
}

export default function TableTemplate({
    title,
    msg,
    desc,
    financial_date,
    market_date,
    tableHead,
    selectHead,
    setSelectHead,
    prevSelectHead,
    setPrevSelectHead,
    tableRow,
    visibleCount,
    setVisibleCount,
}: TablesExample8PropsType) {

    const ADD_COUNT = 50;

    return (
        <>
            <Box className="flex flex-col justify-between w-full p-0 m-0 mb-2">
                <div>{title}</div>
                <div>{desc}</div>
                <div>{financial_date}</div>
                <div>{market_date}</div>
            </Box>

            {tableRow.length === 0 ? (
                <Button variant="ghost">
                    {!!msg ? msg : <><Spinner /> {DEBUG ? "6" : ""}</>}
                </Button>
            ) : (
                <>
                    <div className="w-full max-h-[80vh] overflow-auto rounded">
                        <table className="min-w-full border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-30">
                                <tr>
                                    {tableHead.map((h, idx) => (
                                        <th
                                            key={h.head}
                                            className={`min-w-24 px-2 py-1 text-center font-medium cursor-pointer
                                            ${idx <= 1 ? "min-w-32 sticky left-0 z-40 bg-slate-50 dark:bg-slate-900" : ""}`}
                                            onClick={() => {
                                                if (!setSelectHead) return;
                                                if (prevSelectHead === selectHead) {
                                                    setPrevSelectHead("");
                                                } else {
                                                    setPrevSelectHead(selectHead);
                                                }
                                                setSelectHead(h.head);
                                            }}
                                        >
                                            <Flex direction="row" align="center" justify="center">
                                                <Text size="3">
                                                    {prevSelectHead === h.head && selectHead === h.head
                                                        ? "↑"
                                                        : selectHead === h.head
                                                            ? "↓"
                                                            : ""}
                                                    {h.head}
                                                </Text>
                                            </Flex>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tableRow.slice(0, visibleCount).map((row) => (
                                    <tr key={row.id} className="text-sm text-center items-center justify-center border-b border-gray-200">
                                        <td className="text-center sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 p-2">{row.column_1}</td>
                                        <td className="text-center sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 p-2">{row.column_2}</td>
                                        <td className="p-2">{row.column_3}</td>
                                        <td className={`p-2 ${row.expectedRateOfReturnColor || ""}`}>{row.column_4}</td>
                                        <td className="p-2">{row.column_5}</td>
                                        <td className="p-2">{row.column_6}</td>
                                        <td className="p-2">{row.column_7}</td>
                                        <td className="p-2">{row.column_8}</td>
                                        <td className="p-2">{row.column_9}</td>
                                        <td className="p-2">{row.column_10}</td>
                                        <td className="p-2">{row.column_11}</td>
                                        <td className="p-2">{row.column_12}</td>
                                        <td className="p-2">{row.column_13}</td>
                                        <td className="p-2">{row.column_14}</td>
                                        <td className="p-2">{row.column_15}</td>
                                        <td className="p-2">{row.column_16}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {setVisibleCount && (
                        <DesignButton
                            handleOnClick={() => setVisibleCount((prev: any) => prev + ADD_COUNT)}
                            buttonName={`trade history (more +${ADD_COUNT})`}
                            buttonBgColor="bg-white dark:bg-black"
                            buttonBorderColor="border-black dark:border-white"
                            buttonShadowColor="#D5D5D5"
                            textStyle="text-xs font-bold dark:text-white"
                            buttonStyle={`rounded-lg p-2 ml-2 flex items-center justify-center mb-2 button bg-white cursor-pointer select-none
                                active:translate-y-1 active:[box-shadow:0_0px_0_0_#D5D5D5,0_0px_0_0_#D5D5D541] active:border-[0px]
                                transition-all duration-150 [box-shadow:0_4px_0_0_#D5D5D5,0_8px_0_0_#D5D5D541] border-[1px]`}
                        />
                    )}
                </>
            )}
        </>
    );
}
