import React from "react";

// @material-tailwind/react
import {
    Card,
    Popover,
    Button,
    Spinner,
} from "@material-tailwind/react";
import { DesignButton } from "./designButton";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";


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

function TablesExample8({
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
        <Card className="flex flex-col dark:bg-black dark:text-white h-full w-full rounded-none p-0 m-0">
            <Card.Header className="flex flex-col justify-between w-full p-0 m-0">
                <div className="">
                    {title}
                </div>
                <div className="">
                    {desc}
                </div>
                <div className="">
                    {financial_date}
                </div>
                <div className="">
                    {market_date}
                </div>
            </Card.Header>
            {tableRow.length == 0 ?
                <Button variant="ghost">{!!msg ? <>{msg}</> : <><Spinner size="sm" /> {DEBUG ? "6" : ""}</>}</Button>
                :
                <>
                    <Card.Body className="overflow-scroll [scrollbar-width:thin] [scrollbar-color:#888_transparent] !px-0 pt-0 pb-2 dark:bg-black">
                        <table className="w-full min-w-max table-auto items-center">
                            <thead className="text-xs">
                                <tr>
                                    {tableHead.map(({ head, desc, customeStyle }) => (
                                        <th
                                            key={head}
                                            className={`border-b dark:border-gray-700 pl-3 pb-2 ${customeStyle} dark:text-white`}
                                        >
                                            <div onClick={() => {
                                                console.log(`setSelectHead`, !!setSelectHead, setSelectHead);
                                                if (!!!setSelectHead) {
                                                    return; // do nothing
                                                }
                                                if (prevSelectHead == selectHead) {
                                                    setPrevSelectHead("");
                                                }
                                                else {
                                                    setPrevSelectHead(selectHead);
                                                }
                                                setSelectHead(head)
                                            }}>
                                                <div className={`font-mono flex font-bold dark:text-white cursor-pointer ${head.length >= 6 ? "text-[0.6rem]" : ""}`}>
                                                    <div className="flex-none items-end">
                                                        {(prevSelectHead == head && selectHead == head) ? <ArrowUpIcon className="h-4 w-4" /> : (selectHead == head ? <ArrowDownIcon className="h-4 w-4" /> : "")}
                                                    </div>
                                                    <div className="flex-1">{head}</div>
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tableRow.slice(0, visibleCount).map(
                                    (
                                        {
                                            id,
                                            column_1,
                                            column_2,
                                            column_3,
                                            column_4,
                                            expectedRateOfReturnColor,
                                            column_5,
                                            column_6,
                                            column_7,
                                            column_8,
                                            column_9,
                                            column_10,
                                            column_11,
                                            column_12,
                                            column_13,
                                            column_14,
                                            column_15,
                                            bgColor,
                                        },
                                        index
                                    ) => {
                                        // const isLast = index === tableRow.length - 1;
                                        // const _bgColor = !!bgColor ? bgColor : (index % 2 ? 'bg-blue-gray-50' : '')
                                        const _bgColor = (index % 2 ? 'bg-gray-100 dark:bg-gray-700' : '');
                                        // const classes = isLast
                                        //     ? "!pl-2"
                                        //     : `!pl-2 border-b border-gray-100 ${_bgColor}`;
                                        const classes = `p-0 m-0 pl-1 ${_bgColor}`;
                                        return (
                                            <tr key={id} className="font-mono text-xs text-black dark:text-white dark:bg-black items-center">
                                                <td className={classes}>
                                                    <div className="text-left">
                                                        {column_1}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-right">
                                                        {column_2}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-right">
                                                        {column_3}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className={`text-right ${expectedRateOfReturnColor}`}>
                                                        {column_4}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-right">
                                                        {column_5}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-right">
                                                        {column_6}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-right">
                                                        {column_7}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-right">
                                                        {column_8}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-right">
                                                        {column_9}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-right">
                                                        {column_10}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-right">
                                                        {column_11}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-right">
                                                        {column_12}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-right">
                                                        {column_13}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-right">
                                                        {column_14}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-right">
                                                        {column_15}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }
                                )}
                            </tbody>
                        </table>
                    </Card.Body>
                    {!!setVisibleCount ? <DesignButton
                        handleOnClick={() => setVisibleCount((prev: any) => prev + ADD_COUNT)}
                        buttonName={`더보기 +${ADD_COUNT}`}
                        buttonBgColor="bg-white dark:bg-black"
                        buttonBorderColor="border-black dark:border-white"
                        buttonShadowColor="#D5D5D5"
                        textStyle="text-xs font-bold dark:text-white"
                        buttonStyle={`rounded-lg p-2 ml-2 flex items-center justify-center mb-2 button bg-white cursor-pointer select-none
                                     active:translate-y-1 active:[box-shadow:0_0px_0_0_#D5D5D5,0_0px_0_0_#D5D5D541] active:border-[0px]
                                     transition-all duration-150 [box-shadow:0_4px_0_0_#D5D5D5,0_8px_0_0_#D5D5D541] border-[1px]
                                     `}
                    />
                        : <></>}
                </>
            }
        </Card>
    );
}

export default TablesExample8;