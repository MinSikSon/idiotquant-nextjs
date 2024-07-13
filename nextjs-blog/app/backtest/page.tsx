"use client"

import { getPrevYearAndQuarter, getYearAndQuarterByDate } from "@/components/yearQuarterMatcher";
import { selectMarketInfoList } from "@/lib/features/marketInfo/marketInfoSlice";
import { useAppSelector } from "@/lib/hooks";
import { Slider } from "@material-tailwind/react";
import React, { useEffect } from "react";

// import { ArchiveBoxIcon, ArrowUturnLeftIcon, BellIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";
// import { Button, Card, Chip, ListItem, ListItemPrefix, Navbar, Switch, Timeline, TimelineConnector, TimelineHeader, TimelineIcon, TimelineItem, Typography, } from "@material-tailwind/react";
// import React from "react";

export default function BackTesting(props) {

    console.log(`Step1. 선택할 수 있는 marketInfo date 출력`);
    const marketInfoDateList = useAppSelector(selectMarketInfoList).replaceAll("[", "").replaceAll("]", "").split(",").map(data => data.replaceAll("\"", ""));
    // console.log(`marketInfoDateList`, marketInfoDateList);
    // console.log(`marketInfoDateList.length`, marketInfoDateList.length);

    console.log(`Step2. 해당 marketInfo date 선택하면, financialInfo 와 조합하여 종목 추출 (일단은 전략은 NCAV 로 통일)`);
    console.log(`Step3. 현재 주가와 비교`);

    const [startIndex, setStartIndex] = React.useState(0);
    const [endIndex, setEndIndex] = React.useState(0);
    useEffect(() => {
        if (0 == startIndex) {
            setStartIndex(0);
        }
        if (0 == endIndex) {
            setEndIndex(marketInfoDateList.length - 1);
        }
    }, [marketInfoDateList]);

    function handleChange(e) {
        const offset = Number((100 / marketInfoDateList.length).toFixed(0));
        console.log(`offset`, offset);
        console.log(`handleChange`, e);
        console.log(`handleChange`, e.target.value);
        const index = e.target.value / offset;
        console.log(`index`, index);
        // console.log(`marketInfoDateList`, marketInfoDateList);
        console.log(`marketInfoDateList[index]`, marketInfoDateList[index]);
        if (endIndex > index) {
            setStartIndex(index);
        }
        // offset 에 따라 화면에 값 출력
    }

    function handleChange2(e) {
        console.log(`e`, e);
        const offset = Number((100 / marketInfoDateList.length).toFixed(0));
        console.log(`offset`, offset);
        console.log(`handleChange`, e);
        console.log(`handleChange`, e.target.value);
        const index = e.target.value / offset;
        console.log(`index`, index);
        // console.log(`marketInfoDateList`, marketInfoDateList);
        console.log(`marketInfoDateList[index]`, marketInfoDateList[index]);
        if (startIndex < index) {
            setEndIndex(index);
        }
        // offset 에 따라 화면에 값 출력
    }

    let prevStartYearAndQuarter = { year: 9999, quarter: 1 };
    let prevEndYearAndQuarter = { year: 9999, quarter: 1 };
    console.log(`marketInfoDateList `, marketInfoDateList);
    console.log(`marketInfoDateList.length `, marketInfoDateList.length);
    if ('' != marketInfoDateList[0]) {
        let startYearAndQuarter = getYearAndQuarterByDate(marketInfoDateList[startIndex].split("_")[1]);
        prevStartYearAndQuarter = getPrevYearAndQuarter(startYearAndQuarter.year, startYearAndQuarter.quarter);

        let endYearAndQuarter = getYearAndQuarterByDate(marketInfoDateList[endIndex].split("_")[1]);
        prevEndYearAndQuarter = getPrevYearAndQuarter(endYearAndQuarter.year, endYearAndQuarter.quarter);

    }

    return <>
        <div className="w-full py-2">
            <div>
                start date : {marketInfoDateList[startIndex]}
            </div>
            <Slider
                size={"lg"}
                defaultValue={0}
                value={marketInfoDateList.length > 0 ? Number((100 / marketInfoDateList.length).toFixed(0)) * startIndex : 0}
                step={marketInfoDateList.length > 0 ? (100 / marketInfoDateList.length).toFixed(0) : 1}
                onChange={handleChange}
            />
            <div>
                year:{prevStartYearAndQuarter.year}, quarter:{prevStartYearAndQuarter.quarter}
            </div>
        </div>
        <div className="w-full py-2">
            <div>
                end date : {marketInfoDateList[endIndex]}
            </div>
            <Slider
                size={"lg"}
                defaultValue={100}
                value={marketInfoDateList.length > 0 ? Number((100 / marketInfoDateList.length).toFixed(0)) * endIndex : 0}
                step={marketInfoDateList.length > 0 ? (100 / marketInfoDateList.length).toFixed(0) : 1}
                onChangeCapture={handleChange2}
            />
            <div>
                year:{prevEndYearAndQuarter.year}, quarter:{prevEndYearAndQuarter.quarter}
            </div>
        </div>
    </>;
}
