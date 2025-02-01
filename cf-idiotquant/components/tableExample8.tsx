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
} from "@material-tailwind/react";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
    DocumentMagnifyingGlassIcon,
    FlagIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";

// deepmerge
import merge from "deepmerge";
import Loading from "./Loading";

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
    price: string;
    change: string;
    volume?: string;
    market: string;
    color: string;
    trend?: number; // optional
    chartName?: string;
    chartData?: number[];
    bps?: string;
    eps?: string;
    pbr?: string;
    per?: string;
}

export interface Example8TableHeadType {
    head: string;
    customeStyle?: string;
}

export interface TablesExample8PropsType {
    title: string;
    subTitle: string;
    desc: string;
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
        <section className="m-4">
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
                            - financial date: {financial_date}
                        </Typography>
                        <Typography
                            variant="small"
                            className="text-gray-600 font-normal mt-1"
                        >
                            - market date: {market_date}
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
                                    {tableHead.map(({ head, customeStyle }) => (
                                        <th
                                            key={head}
                                            className={`border-b border-gray-300 !p-4 pb-8 ${customeStyle}`}
                                        >
                                            <Typography
                                                color="blue-gray"
                                                variant="small"
                                                className="!font-bold"
                                            >
                                                {head}
                                            </Typography>
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
                                            price,
                                            change,
                                            volume,
                                            market,
                                            color,
                                            chartName = "2023 Sales",
                                            // chartData = [30, 40, 500, 420, 700, 350, 500, 330, 900,],
                                            chartData = [0, 0, 0, 0, 0, 0, 0, 0, 0,],
                                            bps,
                                            eps,
                                            pbr,
                                            per,
                                        },
                                        index
                                    ) => {
                                        const isLast = index === tableRow.length - 1;
                                        const bgColor = index % 2 ? 'bg-gray-100' : ''
                                        const classes = isLast
                                            ? "!px-4"
                                            : `!px-4 border-b border-gray-300 ${bgColor}`;
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
                                                                className="!font-normal text-gray-600"
                                                            >
                                                                {detail}
                                                            </Typography>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={classes}>
                                                    <Typography
                                                        variant="small"
                                                        className="!font-normal text-gray-600 text-right"
                                                    >
                                                        {price}
                                                    </Typography>
                                                </td>
                                                <td className={classes}>
                                                    <Typography
                                                        variant="small"
                                                        color={color as TypographyProps["color"]}
                                                        className="!font-bold text-right"
                                                    >
                                                        {change}
                                                    </Typography>
                                                </td>
                                                <td className={classes}>
                                                    <Typography
                                                        variant="small"
                                                        className="!font-normal text-gray-600 text-right"
                                                    >
                                                        {volume}
                                                    </Typography>
                                                </td>
                                                <td className={classes}>
                                                    <Typography
                                                        variant="small"
                                                        className="!font-normal text-gray-600 text-right"
                                                    >
                                                        {market}
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