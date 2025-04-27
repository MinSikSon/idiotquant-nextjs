import React from "react";

// @material-tailwind/react
import {
    Card,
    Popover,
    Button,
    Spinner,
} from "@material-tailwind/react";
import { DesignButton } from "./designButton";


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

    const MAX_ORDERING = 3;
    const [ordering, setOrdering] = React.useState(0);

    return (
        <section className="">
            <Card className="h-full w-full">
                <Card.Header className="rounded-none flex flex-wrap gap-4 justify-between mb-4 shadow-none">
                    <div>
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
                    </div>
                </Card.Header>

                {tableRow.length == 0 ?
                    <Button variant="ghost">{!!msg ? <>{msg}</> : <><Spinner size="sm" /> loading...</>}</Button>
                    :
                    <Card.Body className="overflow-scroll !px-0 pt-0 pb-2">
                        <table className="w-full min-w-max table-auto items-center">
                            <thead className="text-xs">
                                <tr>
                                    {tableHead.map(({ head, desc, customeStyle }) => (
                                        <th
                                            key={head}
                                            className={`border-b border-gray-300 pl-3 pb-2 ${customeStyle}`}
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
                                                <div className={`font-mono font-bold text-black cursor-pointer ${head.length >= 6 ? "text-[0.6rem]" : ""}`}>
                                                    {head} {(prevSelectHead == head && selectHead == head) ? "🔼" : (selectHead == head ? "🔽" : "")}
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
                                            bgColor,
                                        },
                                        index
                                    ) => {
                                        // const isLast = index === tableRow.length - 1;
                                        // const _bgColor = !!bgColor ? bgColor : (index % 2 ? 'bg-blue-gray-50' : '')
                                        const _bgColor = (index % 2 ? 'bg-gray-100' : '');
                                        // const classes = isLast
                                        //     ? "!pl-2"
                                        //     : `!pl-2 border-b border-gray-100 ${_bgColor}`;
                                        const classes = `p-0 m-0 pl-1 border-b border-gray-100 ${_bgColor}`;
                                        return (
                                            <tr key={id} className="font-mono text-xs text-black items-center">
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
                                            </tr>
                                        );
                                    }
                                )}
                            </tbody>
                        </table>
                    </Card.Body>
                }
            </Card>
            {/* <button className="justify-center" onClick={() => setVisibleCount((prev: any) => prev + 20)}></button> */}
            <DesignButton
                handleOnClick={() => setVisibleCount((prev: any) => prev + 20)}
                buttonName={"더보기"}
                buttonBgColor="bg-white"
                buttonBorderColor="border-black"
                buttonShadowColor="#D5D5D5"
                textStyle="text-xs font-bold"
                buttonStyle={`rounded-lg p-2 ml-2 flex items-center justify-center mb-2 button bg-white cursor-pointer select-none
                                active:translate-y-1 active:[box-shadow:0_0px_0_0_#D5D5D5,0_0px_0_0_#D5D5D541] active:border-[0px]
                                transition-all duration-150 [box-shadow:0_4px_0_0_#D5D5D5,0_8px_0_0_#D5D5D541] border-[1px]
                                `}
            />
        </section>
    );
}

export default TablesExample8;