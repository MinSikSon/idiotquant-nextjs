import React from "react";
import dynamic from "next/dynamic";

// charts import
const Chart = dynamic(() => import("react-apexcharts"), {
    ssr: false,
});

// @material-tailwind/react
import {
    Card,
    CardHeader,
    CardBody,
    Popover,
    PopoverHandler,
    PopoverContent,
    Button,
} from "@material-tailwind/react";

// deepmerge
import merge from "deepmerge";

// area chart
interface ChartsPropsType {
    height: number;
    series: object[];
    options: object;
}

function AreaChart({
    height = 90,
    series,
    colors,
    options,
}: Partial<ChartsPropsType> & {
    colors: string | string[];
}) {
    const chartOptions = React.useMemo(
        () => ({
            colors,
            ...merge(
                {
                    chart: {
                        height: height,
                        type: "area",
                        zoom: {
                            enabled: false,
                        },
                        toolbar: {
                            show: false,
                        },
                    },
                    title: {
                        show: "",
                    },
                    dataLabels: {
                        enabled: false,
                    },
                    legend: {
                        show: false,
                    },
                    markers: {
                        size: 0,
                        strokeWidth: 0,
                        strokeColors: "transparent",
                    },
                    stroke: {
                        curve: "smooth",
                        width: 2,
                    },
                    grid: {
                        show: false,
                        xaxis: {
                            lines: {
                                show: false,
                            },
                        },
                        padding: {
                            top: 0,
                            right: 0,
                            left: 0,
                            bottom: 0,
                        },
                    },
                    tooltip: {
                        theme: "light",
                    },
                    yaxis: {
                        labels: {
                            show: false,
                        },
                    },
                    xaxis: {
                        axisTicks: {
                            show: false,
                        },
                        axisBorder: {
                            show: false,
                        },
                        labels: {
                            show: false,
                        },
                    },
                    fill: {
                        type: "gradient",
                        gradient: {
                            shadeIntensity: 1,
                            opacityFrom: 0.4,
                            opacityTo: 0.6,
                            stops: [0, 100],
                        },
                    },
                },
                options ? options : {}
            ),
        }),
        [height, colors, options]
    );

    return (
        <Chart
            type="area"
            height={height}
            series={series as ApexAxisChartSeries}
            options={chartOptions as any}
        />
    );
}


export interface Example8TableRowType {
    id: any;
    column_1?: any;
    column_2: any;
    column_3: any;
    column_4: any;
    expectedRateOfReturnColor: any;
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
    subTitle: any;
    desc: any;
    financial_date: any;
    market_date: any;
    tableHead: Example8TableHeadType[];
    tableRow: Example8TableRowType[];
}

function TablesExample8({
    title,
    subTitle,
    desc,
    financial_date,
    market_date,
    tableHead,
    tableRow
}: TablesExample8PropsType) {
    return (
        <section className="">
            <Card className="h-full w-full">
                <CardHeader
                    floated={false}
                    shadow={false}
                    className="rounded-none flex flex-wrap gap-4 justify-between mb-4"
                >
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
                </CardHeader>

                {tableRow.length == 0 ?
                    <Button variant="text" loading={true} className="font-mono">loading...</Button>
                    :
                    <CardBody className="overflow-scroll !px-0 pt-0 pb-2">
                        <table className="w-full min-w-max table-auto items-center">
                            <thead className="text-xs">
                                <tr>
                                    {tableHead.map(({ head, desc, customeStyle }) => (
                                        <th
                                            key={head}
                                            className={`border-b border-gray-300 pl-3 pb-2 ${customeStyle}`}
                                        >
                                            <Popover>
                                                <PopoverHandler>
                                                    <div className={`font-mono font-bold text-black cursor-pointer ${head.length >= 6 ? "text-[0.6rem]" : ""}`}>
                                                        {head}
                                                    </div>
                                                </PopoverHandler>
                                                <PopoverContent className="p-2 border border-black rounded shadow shadow-blue-gray-500">
                                                    <div className="text-xs font-mono text-black">{desc}</div>
                                                </PopoverContent>
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
                    </CardBody>
                }
            </Card>
        </section>
    );
}

export default TablesExample8;