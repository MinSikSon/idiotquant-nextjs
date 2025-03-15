import React from "react";

// @material-tailwind/react
import {
    Card,
    Popover,
    Button,
    Spinner,
} from "@material-tailwind/react";


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
    tableRow
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
                    <Button variant="ghost" className="font-mono flex">{!!msg ? <>{msg}</> : <><Spinner size="sm" />loading...</>}</Button>
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
                                            <Popover>
                                                <Popover.Trigger onClick={() => {
                                                    // console.log(`setSelectHead`, !!setSelectHead, setSelectHead);
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
                                                </Popover.Trigger>
                                                {!!desc ? <Popover.Content className="p-2 border border-black rounded shadow shadow-blue-gray-500">
                                                    <div className="text-xs font-mono text-black">{desc}</div>
                                                </Popover.Content> : <></>}

                                            </Popover>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tableRow.map(
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
                                        const _bgColor = !!bgColor ? bgColor : (index % 2 ? 'bg-blue-gray-50' : '')
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
        </section>
    );
}

export default TablesExample8;