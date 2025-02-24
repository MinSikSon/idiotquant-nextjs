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
} from "@material-tailwind/react";

// deepmerge
import merge from "deepmerge";
import Loading from "@/components/Loading";

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
    img?: any;
    digitalAsset: any;
    detail: any;
    closePrice: any;
    expectedRateOfReturn: any;
    expectedRateOfReturnColor: any;
    targetPrice?: any;
    market: any;
    netCurrentAssert?: any;
    netIncome?: any;
    chartName?: any;
    bps?: any;
    eps?: any;
    pbr?: any;
    per?: any;
    tag?: any;
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
                    <Loading loadingMsg={`loading`} />
                    :
                    <CardBody className="overflow-scroll !px-0 pt-0 pb-2">
                        <table className="w-full min-w-max table-auto items-center">
                            <thead>
                                <tr>
                                    {tableHead.map(({ head, desc, customeStyle }) => (
                                        <th
                                            key={head}
                                            className={`border-b border-gray-300 pl-3 pb-2 ${customeStyle}`}
                                        >
                                            <Popover>
                                                <PopoverHandler>
                                                    <div className="!font-bold text-sm text-black cursor-pointer">
                                                        {head}
                                                    </div>
                                                </PopoverHandler>
                                                <PopoverContent>
                                                    <span className="text-sm text-red-500">{desc}</span>
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
                                            img,
                                            digitalAsset,
                                            detail,
                                            tag,
                                            closePrice,
                                            expectedRateOfReturn,
                                            expectedRateOfReturnColor,
                                            targetPrice,
                                            market,
                                            netCurrentAssert,
                                            netIncome,
                                            bps,
                                            eps,
                                            pbr,
                                            per,
                                            bgColor,
                                        },
                                        index
                                    ) => {
                                        // const isLast = index === tableRow.length - 1;
                                        const _bgColor = !!bgColor ? bgColor : (index % 2 ? 'bg-blue-gray-50' : '')
                                        // const classes = isLast
                                        //     ? "!pl-2"
                                        //     : `!pl-2 border-b border-gray-100 ${_bgColor}`;
                                        const classes = `p-0 m-0 pl-2 border-b border-gray-100 ${_bgColor}`;
                                        return (
                                            <tr key={digitalAsset} className="items-center">
                                                <td className={classes}>
                                                    <div className="flex items-center gap-4 text-left">
                                                        <div>
                                                            <div className="text-sm font-bold text-black">
                                                                <div className="flex items-center">
                                                                    {tag}
                                                                    {detail}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-sm text-gray-600 text-right">
                                                        {closePrice}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className={`text-sm font-bold text-right ${expectedRateOfReturnColor}`}>
                                                        {expectedRateOfReturn}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-sm text-gray-600 text-right">
                                                        {targetPrice}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-sm text-gray-600 text-right">
                                                        {market}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-sm text-gray-600 text-right">
                                                        {netCurrentAssert}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-sm text-gray-600 text-right">
                                                        {netIncome}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-sm text-gray-600 text-right">
                                                        {bps}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-sm text-gray-600 text-right">
                                                        {eps}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-sm text-gray-600 text-right">
                                                        {pbr}
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <div className="text-sm text-gray-600 text-right">
                                                        {per}
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