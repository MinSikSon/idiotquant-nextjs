"use client";

import * as React from "react";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { Card, Typography } from "@material-tailwind/react";
import { SelectFace3d } from "iconoir-react";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "next-themes";

function rgbToHex(rgb: any) {
    return (
        "#" +
        rgb
            .map((x: any) => {
                const hex = parseInt(x, 10).toString(16);
                return hex.length === 1 ? "0" + hex : hex;
            })
            .join("")
    );
}

export default function LineChart() {
    const { theme } = useTheme();
    const [vars, setVars] = React.useState<CSSStyleDeclaration | null>(null);

    React.useEffect(() => {
        const cssVarValue = window.getComputedStyle(document.documentElement);

        setVars(cssVarValue);
    }, [theme]);

    const chartColor = vars
        ? rgbToHex(vars.getPropertyValue("--color-primary").split(" "))
        : "";
    const textColor = vars
        ? rgbToHex(vars.getPropertyValue("--color-foreground").split(" "))
        : "";
    const lineColor = vars
        ? rgbToHex(vars.getPropertyValue("--color-surface").split(" "))
        : "";

    const test_data = [

        {
            "time_stamp": "2025-03-04T08:30:18.965Z",
            "stock_list": [
                {
                    "stock_name": "백금T&A",
                    "stock_code": "046310",
                    "buyOrSell": "buy",
                    "remaining_token": "6016",
                    "stck_prpr": "2405",
                    "ORD_QTY": "2"
                },
                {
                    "stock_name": "삼성공조",
                    "stock_code": "006660",
                    "buyOrSell": "buy",
                    "remaining_token": "18340",
                    "stck_prpr": "18200",
                    "ORD_QTY": "1"
                },
                {
                    "stock_name": "제이엠티",
                    "stock_code": "094970",
                    "buyOrSell": "buy",
                    "remaining_token": "6664",
                    "stck_prpr": "2600",
                    "ORD_QTY": "2"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T08:40:18.777Z",
            "stock_list": [
                {
                    "stock_name": "우진아이엔에스",
                    "stock_code": "010400",
                    "buyOrSell": "buy",
                    "remaining_token": "7468",
                    "stck_prpr": "2975",
                    "ORD_QTY": "2"
                },
                {
                    "stock_name": "서원인텍",
                    "stock_code": "093920",
                    "buyOrSell": "buy",
                    "remaining_token": "5640",
                    "stck_prpr": "5310",
                    "ORD_QTY": "1"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T08:50:18.778Z",
            "stock_list": [
                {
                    "stock_name": "서산",
                    "stock_code": "079650",
                    "buyOrSell": "buy",
                    "remaining_token": "6102",
                    "stck_prpr": "1225",
                    "ORD_QTY": "4"
                },
                {
                    "stock_name": "액토즈소프트",
                    "stock_code": "052790",
                    "buyOrSell": "buy",
                    "remaining_token": "8578",
                    "stck_prpr": "6860",
                    "ORD_QTY": "1"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T09:00:19.253Z",
            "stock_list": [
                {
                    "stock_name": "일진다이아",
                    "stock_code": "081000",
                    "buyOrSell": "buy",
                    "remaining_token": "15898",
                    "stck_prpr": "11880",
                    "ORD_QTY": "1"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T09:10:18.779Z",
            "stock_list": [
                {
                    "stock_name": "파인디지털",
                    "stock_code": "038950",
                    "buyOrSell": "buy",
                    "remaining_token": "5788",
                    "stck_prpr": "3185",
                    "ORD_QTY": "1"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T09:20:18.778Z",
            "stock_list": [
                {
                    "stock_name": "우리엔터프라이즈",
                    "stock_code": "037400",
                    "buyOrSell": "buy",
                    "remaining_token": "6066",
                    "stck_prpr": "1131",
                    "ORD_QTY": "5"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T09:30:18.842Z",
            "stock_list": [
                {
                    "stock_name": "삼지전자",
                    "stock_code": "037460",
                    "buyOrSell": "buy",
                    "remaining_token": "15239",
                    "stck_prpr": "10220",
                    "ORD_QTY": "1"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T09:40:18.777Z",
            "stock_list": [
                {
                    "stock_name": "동양파일",
                    "stock_code": "228340",
                    "buyOrSell": "buy",
                    "remaining_token": "6245",
                    "stck_prpr": "1704",
                    "ORD_QTY": "3"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T09:50:18.778Z",
            "stock_list": [
                {
                    "stock_name": "진도",
                    "stock_code": "088790",
                    "buyOrSell": "buy",
                    "remaining_token": "6125",
                    "stck_prpr": "1807",
                    "ORD_QTY": "3"
                },
                {
                    "stock_name": "매일홀딩스",
                    "stock_code": "005990",
                    "buyOrSell": "buy",
                    "remaining_token": "15051",
                    "stck_prpr": "9940",
                    "ORD_QTY": "1"
                },
                {
                    "stock_name": "에스제이엠홀딩스",
                    "stock_code": "025530",
                    "buyOrSell": "buy",
                    "remaining_token": "5746",
                    "stck_prpr": "3040",
                    "ORD_QTY": "1"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T10:00:19.054Z",
            "stock_list": [
                {
                    "stock_name": "와토스코리아",
                    "stock_code": "079000",
                    "buyOrSell": "buy",
                    "remaining_token": "9711",
                    "stck_prpr": "5270",
                    "ORD_QTY": "1"
                },
                {
                    "stock_name": "신영와코루",
                    "stock_code": "005800",
                    "buyOrSell": "buy",
                    "remaining_token": "14886",
                    "stck_prpr": "10040",
                    "ORD_QTY": "1"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T10:10:18.779Z",
            "stock_list": [
                {
                    "stock_name": "디와이",
                    "stock_code": "013570",
                    "buyOrSell": "buy",
                    "remaining_token": "6788",
                    "stck_prpr": "3900",
                    "ORD_QTY": "1"
                },
                {
                    "stock_name": "엔케이",
                    "stock_code": "085310",
                    "buyOrSell": "buy",
                    "remaining_token": "5769",
                    "stck_prpr": "910",
                    "ORD_QTY": "6"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T10:20:18.789Z",
            "stock_list": [
                {
                    "stock_name": "세중",
                    "stock_code": "039310",
                    "buyOrSell": "buy",
                    "remaining_token": "6263",
                    "stck_prpr": "1700",
                    "ORD_QTY": "3"
                },
                {
                    "stock_name": "루멘스",
                    "stock_code": "038060",
                    "buyOrSell": "buy",
                    "remaining_token": "6097",
                    "stck_prpr": "970",
                    "ORD_QTY": "6"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T10:30:18.851Z",
            "stock_list": [
                {
                    "stock_name": "동원개발",
                    "stock_code": "013120",
                    "buyOrSell": "buy",
                    "remaining_token": "7739",
                    "stck_prpr": "2335",
                    "ORD_QTY": "3"
                },
                {
                    "stock_name": "대덕",
                    "stock_code": "008060",
                    "buyOrSell": "buy",
                    "remaining_token": "7736",
                    "stck_prpr": "7090",
                    "ORD_QTY": "1"
                },
                {
                    "stock_name": "대창스틸",
                    "stock_code": "140520",
                    "buyOrSell": "buy",
                    "remaining_token": "6570",
                    "stck_prpr": "2030",
                    "ORD_QTY": "3"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T10:40:18.779Z",
            "stock_list": [
                {
                    "stock_name": "글로벌에스엠",
                    "stock_code": "900070",
                    "buyOrSell": "buy",
                    "remaining_token": "5625",
                    "stck_prpr": "396",
                    "ORD_QTY": "14"
                },
                {
                    "stock_name": "에스제이엠",
                    "stock_code": "123700",
                    "buyOrSell": "buy",
                    "remaining_token": "5969",
                    "stck_prpr": "2875",
                    "ORD_QTY": "2"
                },
                {
                    "stock_name": "로스웰",
                    "stock_code": "900260",
                    "buyOrSell": "buy",
                    "remaining_token": "6194",
                    "stck_prpr": "597",
                    "ORD_QTY": "10"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T10:50:18.785Z",
            "stock_list": [
                {
                    "stock_name": "크리스탈신소재",
                    "stock_code": "900250",
                    "buyOrSell": "buy",
                    "remaining_token": "6083",
                    "stck_prpr": "935",
                    "ORD_QTY": "6"
                },
                {
                    "stock_name": "컬러레이",
                    "stock_code": "900310",
                    "buyOrSell": "buy",
                    "remaining_token": "6127",
                    "stck_prpr": "866",
                    "ORD_QTY": "7"
                },
                {
                    "stock_name": "이스트아시아홀딩스",
                    "stock_code": "900110",
                    "buyOrSell": "buy",
                    "remaining_token": "5627",
                    "stck_prpr": "47",
                    "ORD_QTY": "119"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T11:00:19.149Z",
            "stock_list": [
                {
                    "stock_name": "삼양통상",
                    "stock_code": "002170",
                    "buyOrSell": "buy",
                    "remaining_token": "52076",
                    "stck_prpr": "47100",
                    "ORD_QTY": "1"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T11:10:18.778Z",
            "stock_list": [
                {
                    "stock_name": "세보엠이씨",
                    "stock_code": "011560",
                    "buyOrSell": "buy",
                    "remaining_token": "10737",
                    "stck_prpr": "9880",
                    "ORD_QTY": "1"
                },
                {
                    "stock_name": "원일특강",
                    "stock_code": "012620",
                    "buyOrSell": "buy",
                    "remaining_token": "9057",
                    "stck_prpr": "7070",
                    "ORD_QTY": "1"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T11:20:18.778Z",
            "stock_list": [
                {
                    "stock_name": "세원물산",
                    "stock_code": "024830",
                    "buyOrSell": "buy",
                    "remaining_token": "9588",
                    "stck_prpr": "7620",
                    "ORD_QTY": "1"
                },
                {
                    "stock_name": "아세아텍",
                    "stock_code": "050860",
                    "buyOrSell": "buy",
                    "remaining_token": "6828",
                    "stck_prpr": "2030",
                    "ORD_QTY": "3"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T11:30:18.847Z",
            "stock_list": [
                {
                    "stock_name": "이니텍",
                    "stock_code": "053350",
                    "buyOrSell": "buy",
                    "remaining_token": "6394",
                    "stck_prpr": "4965",
                    "ORD_QTY": "1"
                },
                {
                    "stock_name": "와토스코리아",
                    "stock_code": "079000",
                    "buyOrSell": "buy",
                    "remaining_token": "10739",
                    "stck_prpr": "5270",
                    "ORD_QTY": "2"
                },
                {
                    "stock_name": "서원인텍",
                    "stock_code": "093920",
                    "buyOrSell": "buy",
                    "remaining_token": "9289",
                    "stck_prpr": "5290",
                    "ORD_QTY": "1"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T12:10:18.778Z",
            "stock_list": [
                {
                    "stock_name": "서산",
                    "stock_code": "079650",
                    "buyOrSell": "buy",
                    "remaining_token": "1409",
                    "stck_prpr": "1211",
                    "ORD_QTY": "1"
                }
            ]
        },
        {
            "time_stamp": "2025-03-04T14:10:18.779Z",
            "stock_list": [
                {
                    "stock_name": "이스트아시아홀딩스",
                    "stock_code": "900110",
                    "buyOrSell": "buy",
                    "remaining_token": "253",
                    "stck_prpr": "48",
                    "ORD_QTY": "5"
                }
            ]
        },
        {
            "time_stamp": "2025-03-05T08:20:53.198Z",
            "stock_list": [
                {
                    "stock_name": "파인디지털",
                    "stock_code": "038950",
                    "buyOrSell": "buy",
                    "remaining_token": "4125",
                    "stck_prpr": "3155",
                    "ORD_QTY": "1"
                }
            ]
        },
        {
            "time_stamp": "2025-03-05T08:30:53.254Z",
            "stock_list": [
                {
                    "stock_name": "세원물산",
                    "stock_code": "024830",
                    "buyOrSell": "buy",
                    "remaining_token": "8631",
                    "stck_prpr": "7670",
                    "ORD_QTY": "1"
                },
                {
                    "stock_name": "우리엔터프라이즈",
                    "stock_code": "037400",
                    "buyOrSell": "buy",
                    "remaining_token": "1934",
                    "stck_prpr": "1134",
                    "ORD_QTY": "1"
                }
            ]
        },
        {
            "time_stamp": "2025-03-05T08:50:53.197Z",
            "stock_list": [
                {
                    "stock_name": "동양파일",
                    "stock_code": "228340",
                    "buyOrSell": "buy",
                    "remaining_token": "2658",
                    "stck_prpr": "1739",
                    "ORD_QTY": "1"
                }
            ]
        },
        {
            "time_stamp": "2025-03-05T09:00:54.244Z",
            "stock_list": [
                {
                    "stock_name": "진도",
                    "stock_code": "088790",
                    "buyOrSell": "buy",
                    "remaining_token": "2230",
                    "stck_prpr": "1803",
                    "ORD_QTY": "1"
                },
                {
                    "stock_name": "에스제이엠홀딩스",
                    "stock_code": "025530",
                    "buyOrSell": "buy",
                    "remaining_token": "4232",
                    "stck_prpr": "3040",
                    "ORD_QTY": "1"
                }
            ]
        },
        {
            "time_stamp": "2025-03-05T09:10:53.197Z",
            "stock_list": [
                {
                    "stock_name": "와토스코리아",
                    "stock_code": "079000",
                    "buyOrSell": "buy",
                    "remaining_token": "5968",
                    "stck_prpr": "5220",
                    "ORD_QTY": "1"
                }
            ]
        },
        {
            "time_stamp": "2025-03-05T09:20:53.196Z",
            "stock_list": [
                {
                    "stock_name": "디와이",
                    "stock_code": "013570",
                    "buyOrSell": "buy",
                    "remaining_token": "4416",
                    "stck_prpr": "3890",
                    "ORD_QTY": "1"
                },
                {
                    "stock_name": "엔케이",
                    "stock_code": "085310",
                    "buyOrSell": "buy",
                    "remaining_token": "1837",
                    "stck_prpr": "932",
                    "ORD_QTY": "1"
                }
            ]
        },
        {
            "time_stamp": "2025-03-05T09:30:53.248Z",
            "stock_list": [
                {
                    "stock_name": "세중",
                    "stock_code": "039310",
                    "buyOrSell": "buy",
                    "remaining_token": "2692",
                    "stck_prpr": "1665",
                    "ORD_QTY": "1"
                },
                {
                    "stock_name": "루멘스",
                    "stock_code": "038060",
                    "buyOrSell": "buy",
                    "remaining_token": "1806",
                    "stck_prpr": "961",
                    "ORD_QTY": "1"
                }
            ]
        },
        {
            "time_stamp": "2025-03-05T09:50:53.196Z",
            "stock_list": [
                {
                    "stock_name": "글로벌에스엠",
                    "stock_code": "900070",
                    "buyOrSell": "buy",
                    "remaining_token": "1612",
                    "stck_prpr": "390",
                    "ORD_QTY": "4"
                },
                {
                    "stock_name": "로스웰",
                    "stock_code": "900260",
                    "buyOrSell": "buy",
                    "remaining_token": "1755",
                    "stck_prpr": "601",
                    "ORD_QTY": "2"
                }
            ]
        },
        {
            "time_stamp": "2025-03-05T10:00:53.460Z",
            "stock_list": [
                {
                    "stock_name": "크리스탈신소재",
                    "stock_code": "900250",
                    "buyOrSell": "buy",
                    "remaining_token": "2005",
                    "stck_prpr": "930",
                    "ORD_QTY": "2"
                },
                {
                    "stock_name": "컬러레이",
                    "stock_code": "900310",
                    "buyOrSell": "buy",
                    "remaining_token": "1597",
                    "stck_prpr": "868",
                    "ORD_QTY": "1"
                },
                {
                    "stock_name": "이스트아시아홀딩스",
                    "stock_code": "900110",
                    "buyOrSell": "buy",
                    "remaining_token": "1326",
                    "stck_prpr": "46",
                    "ORD_QTY": "28"
                }
            ]
        },
        {
            "time_stamp": "2025-03-05T10:30:53.248Z",
            "stock_list": [
                {
                    "stock_name": "아세아텍",
                    "stock_code": "050860",
                    "buyOrSell": "buy",
                    "remaining_token": "2271",
                    "stck_prpr": "2020",
                    "ORD_QTY": "1"
                }
            ]
        },
    ];

    const chartConfig = React.useMemo(
        () =>
            ({
                type: "line",
                height: 240,
                series: [
                    {
                        name: "remaining_token",
                        // data: test_data.stock_list.map((stock: any) => stock.remaining_token),
                        // data: [10, 20, 30, 40, 50, 60, 70, 80, 90],
                        data: test_data.map(entry =>
                            entry.stock_list.reduce((sum, stock) => sum + Number(stock.remaining_token), 0)
                        ),
                        color: "#FF4560",
                    },
                    {
                        name: "stck_prpr",
                        // data: test_data.stock_list.map((stock: any) => stock.stck_prpr * stock.ORD_QTY),
                        // data: [50, 60, 70, 80, 90, 10, 20, 30, 40],
                        data: test_data.map(entry =>
                            entry.stock_list.reduce((sum, stock) => sum + (Number(stock.stck_prpr) * Number(stock.ORD_QTY)), 0)
                        ),
                        color: "#0088CC",
                    },
                    // {
                    //     name: "Sales_b",
                    //     data: [350, 200, 230, 500, 50, 40, 300, 320, 500],
                    // },
                ],
                options: {
                    chart: {
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
                    colors: [chartColor],
                    stroke: {
                        curve: "smooth",
                        lineCap: "round",
                    },
                    markers: {
                        size: 0,
                    },
                    xaxis: {
                        axisTicks: {
                            show: false,
                        },
                        axisBorder: {
                            show: false,
                        },
                        labels: {
                            style: {
                                colors: textColor,
                                // fontSize: "12px",
                                fontSize: "6px",
                                fontFamily: "inherit",
                                fontWeight: 400,
                            },
                        },
                        // categories: [
                        //     "Apr",
                        //     "May",
                        //     "Jun",
                        //     "Jul",
                        //     "Aug",
                        //     "Sep",
                        //     "Oct",
                        //     "Nov",
                        //     "Dec",
                        // ],
                        // categories: test_data.stock_list.map((stock: any) => stock.stock_name),
                        categories: test_data.map(entry => entry.time_stamp),
                    },
                    yaxis: {
                        labels: {
                            style: {
                                colors: textColor,
                                fontSize: "12px",
                                fontFamily: "inherit",
                                fontWeight: 400,
                            },
                        },
                    },
                    grid: {
                        show: true,
                        borderColor: lineColor,
                        strokeDashArray: 5,
                        xaxis: {
                            lines: {
                                show: true,
                            },
                        },
                        padding: {
                            top: 5,
                            right: 20,
                        },
                    },
                    fill: {
                        opacity: 0.8,
                    },
                    tooltip: {
                        theme: "dark",
                    },
                },
            }) as ApexOptions,
        [chartColor, textColor, lineColor],
    );

    return (
        <Card>
            <Card.Header className="m-0 flex flex-wrap items-center gap-4 p-4">
                <Card
                    color="primary"
                    className="grid h-16 w-16 shrink-0 place-items-center rounded-md text-primary-foreground md:h-20 md:w-20"
                >
                    <SelectFace3d className="h-6 w-6 md:h-8 md:w-8" />
                </Card>
                <div>
                    <Typography type="h6">Line Chart</Typography>
                    <Typography className="mt-1 max-w-sm text-foreground">
                        Visualize your data in a simple way using the
                        @material-tailwind/react chart plugin.
                    </Typography>
                </div>
            </Card.Header>
            <Card.Body>
                <Chart {...chartConfig} />
            </Card.Body>
        </Card>
    );
}
