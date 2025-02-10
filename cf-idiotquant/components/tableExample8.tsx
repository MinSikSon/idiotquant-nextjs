import React from "react";
import dynamic from "next/dynamic";

// charts import
const Chart = dynamic(() => import("react-apexcharts"), {
    ssr: false,
});

// @material-tailwind/react
import {
    Button,
    Typography,
    Card,
    CardHeader,
    CardBody,
    IconButton,
    Input,
    TypographyProps,
    Popover,
    PopoverHandler,
    PopoverContent,
} from "@material-tailwind/react";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
    DocumentMagnifyingGlassIcon,
    FlagIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";

// deepmerge
import merge from "deepmerge";
import Loading from "@/components/Loading";
import { Util } from "@/components/util";

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
    img?: string;
    digitalAsset: string;
    detail: string;
    closePrice: string;
    expectedRateOfReturn: string;
    expectedRateOfReturnColor: string;
    targetPrice?: any;
    market: string;
    netCurrentAssert?: string;
    netIncome?: string;
    chartName?: string;
    bps?: string;
    eps?: string;
    pbr?: string;
    per?: string;
    tag?: any;
}

export interface Example8TableHeadType {
    head: string;
    desc?: string;
    customeStyle?: string;
}

export interface TablesExample8PropsType {
    title: any;
    subTitle: string;
    desc: any;
    financial_date: string;
    market_date: string;
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
        <section className="m-2">
            <Card className="h-full w-full">
                <CardHeader
                    floated={false}
                    shadow={false}
                    className="rounded-none flex flex-wrap gap-4 justify-between mb-4"
                >
                    <div>
                        <Typography variant="h6" color="blue-gray">
                            {/* Cryptocurrency Market Overview */}
                            {title}
                        </Typography>
                        <Typography
                            variant="small"
                            className="text-gray-600 font-normal mt-1"
                        >
                            {/* Compare different cryptocurrencies, and make informed investment. */}
                            {/* {subTitle} */}
                            {desc}
                        </Typography>
                        <Typography
                            variant="small"
                            className="text-gray-600 font-normal mt-1"
                        >
                            {financial_date}
                        </Typography>
                        <Typography
                            variant="small"
                            className="text-gray-600 font-normal mt-1"
                        >
                            {market_date}
                        </Typography>
                    </div>
                    {/* <div className="flex items-center w-full shrink-0 gap-4 md:w-max">
                        <div className="w-full md:w-72">
                            <Input
                                size="lg"
                                label="Search"
                                icon={<MagnifyingGlassIcon className="h-5 w-5" />}
                            />
                        </div>
                        <Button
                            variant="outlined"
                            className="flex items-center gap-2"
                        >
                            24h
                            <ChevronDownIcon strokeWidth={3} className="w-3 h-3" />
                        </Button>
                    </div> */}
                </CardHeader>

                {tableRow.length == 0 ?
                    <Loading loadingMsg={`loading`} />
                    :
                    <CardBody className="overflow-scroll !px-0 py-2">
                        <table className="w-full min-w-max table-auto">
                            <thead>
                                <tr>
                                    {tableHead.map(({ head, desc, customeStyle }) => (
                                        <th
                                            key={head}
                                            className={`border-b border-gray-300 pl-3 pb-2 ${customeStyle}`}
                                        >
                                            <Popover>
                                                <PopoverHandler>
                                                    <Typography
                                                        color="blue-gray"
                                                        variant="small"
                                                        className="!font-bold cursor-pointer"
                                                    >
                                                        {head}
                                                    </Typography>
                                                </PopoverHandler>
                                                <PopoverContent>
                                                    {desc}
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
                                        },
                                        index
                                    ) => {
                                        const isLast = index === tableRow.length - 1;
                                        const bgColor = index % 2 ? 'bg-blue-gray-50' : ''
                                        const classes = isLast
                                            ? "!pl-2"
                                            : `!pl-2 border-b border-gray-100 ${bgColor}`;
                                        return (
                                            <tr key={digitalAsset}>
                                                <td className={classes}>
                                                    <div className="flex items-center gap-4 text-left">
                                                        {/* <img
                                                        src={img}
                                                        alt={digitalAsset}
                                                        className="border rounded-md p-1 h-10 w-10"
                                                    /> */}
                                                        <div>
                                                            {/* <Typography
                                                            variant="small"
                                                            color="blue-gray"
                                                            className="!font-semibold"
                                                        >
                                                            {digitalAsset}
                                                        </Typography> */}
                                                            <Typography
                                                                // variant="small"
                                                                variant="h6"
                                                                className="!font-normal text-black"
                                                            >
                                                                <div className="flex">
                                                                    {tag}
                                                                    {detail}
                                                                </div>
                                                            </Typography>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <Typography
                                                        variant="small"
                                                        className="!font-normal text-gray-600 text-right"
                                                    >
                                                        {isNaN(Number(closePrice)) ? closePrice : Util.UnitConversion(Number(closePrice), true)}
                                                    </Typography>
                                                </td>
                                                <td className={classes}>
                                                    <Typography
                                                        variant="small"
                                                        color={expectedRateOfReturnColor as TypographyProps["color"]}
                                                        className="!font-bold text-right"
                                                    >
                                                        {expectedRateOfReturn}
                                                    </Typography>
                                                </td>
                                                <td className={classes}>
                                                    <Typography
                                                        variant="small"
                                                        className="!font-normal text-gray-600 text-right"
                                                    >
                                                        {targetPrice}
                                                    </Typography>
                                                </td>
                                                <td className={classes}>
                                                    <Typography
                                                        variant="small"
                                                        className="!font-normal text-gray-600 text-right"
                                                    >
                                                        {isNaN(Number(market)) ? market : Util.UnitConversion(Number(market), true)}
                                                    </Typography>
                                                </td>
                                                <td className={classes}>
                                                    <Typography
                                                        variant="small"
                                                        className="!font-normal text-gray-600 text-right"
                                                    >
                                                        {isNaN(Number(netCurrentAssert)) ? netCurrentAssert : Util.UnitConversion(Number(netCurrentAssert), true)}
                                                    </Typography>
                                                </td>
                                                <td className={classes}>
                                                    <Typography
                                                        variant="small"
                                                        className="!font-normal text-gray-600 text-right"
                                                    >
                                                        {isNaN(Number(netIncome)) ? netIncome : Util.UnitConversion(Number(netIncome), true)}
                                                    </Typography>
                                                </td>
                                                <td className={classes}>
                                                    <Typography
                                                        variant="small"
                                                        className="!font-normal text-gray-600 text-right"
                                                    >
                                                        {bps}
                                                    </Typography>
                                                </td>
                                                <td className={classes}>
                                                    <Typography
                                                        variant="small"
                                                        className="!font-normal text-gray-600 text-right"
                                                    >
                                                        {eps}
                                                    </Typography>
                                                </td>
                                                <td className={classes}>
                                                    <Typography
                                                        variant="small"
                                                        className="!font-normal text-gray-600 text-right"
                                                    >
                                                        {pbr}
                                                    </Typography>
                                                </td>
                                                <td className={classes}>
                                                    <Typography
                                                        variant="small"
                                                        className="!font-normal text-gray-600 text-right"
                                                    >
                                                        {per}
                                                    </Typography>
                                                </td>
                                                {/* <td className={classes}>
                                                <div className="max-w-[12rem] ml-auto h-12 -translate-y-6">
                                                    <AreaChart
                                                        colors={["#2196F373"]}
                                                        options={{}}
                                                        series={[
                                                            {
                                                                name: chartName,
                                                                data: chartData,
                                                            },
                                                        ]}
                                                    />
                                                </div>
                                            </td> */}
                                                {/* <td className={classes}>
                                                <div className="flex justify-end gap-4">
                                                    <IconButton variant="text" size="sm">
                                                        <DocumentMagnifyingGlassIcon className="h-5 w-5 text-gray-900" />
                                                    </IconButton>
                                                    <IconButton variant="text" size="sm">
                                                        <FlagIcon className="h-5 w-5 text-gray-900" />
                                                    </IconButton>
                                                </div>
                                            </td> */}
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