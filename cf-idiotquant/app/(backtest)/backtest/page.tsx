"use client"

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button, ButtonGroup } from "@material-tailwind/react";
import RegisterTemplate from "@/components/register_template";
import Link from "next/link";

import {
    Timeline,
    TimelineItem,
    TimelineConnector,
    TimelineHeader,
    TimelineIcon,
    TimelineBody,
    Typography,
} from "@material-tailwind/react";

export default function BackTest() {
    // const dispatch = useAppDispatch();
    const getTitle = () => {
        return "back test"
    }
    const getSubTitle = () => {
        return "back test gogo"
    }
    const getStepContents = (title: string, list: any[], selectValue: any, handleOnClick: any) => {
        return <div className="flex flex-col">
            <div className="flex flex-col justify-between items-left mt-2 text-black hover:text-blue-500">
                <div>{title}</div>
                <ButtonGroup color="blue" variant="outlined" size="sm" fullWidth>
                    {list.map((item, key) => <Button key={key} className={selectValue == item ? `bg-blue-500 text-white` : ``} onClick={() => handleOnClick(item)}>{`${item}`}</Button>)}
                </ButtonGroup>
            </div>
        </div>
    }

    const handleOnClick = () => {
        console.log(`[handleOnClick] do nothing`);
    }
    // 1. 특정 날짜 기준으로 종목 뽑기
    // - strategy-register 참고
    // 2. 해당 종목을 팔기
    // - 현재 가격으로 비교
    // { getStepContents("전략", ["test"], "test", (item: any) => { dispatch(setDefaultStrategy(item)); }) }
    return <>
        <RegisterTemplate
            cardBodyFix={true}
            title={getTitle()}
            subTitle={getSubTitle()}
            content={getStepContents("전략", ["test"], "test", (item: any) => { console.log(`do nothing`, item); })}
            footer={
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <Link href={`/`}>
                            <Button color="red" size="sm" variant="outlined">
                                {/* prev */}
                                취소
                            </Button>
                        </Link>
                        {/* <Link href={`/`}> */}
                        <Button className="hover:text-blue-500 hover:border-blue-500" color={`black`} onClick={() => handleOnClick()} size="sm" variant="outlined">
                            등록
                        </Button>
                        {/* </Link> */}
                    </div>
                </div>
            }
        />
        <div className="p-2 m-2 border rounded">
            <DefaultTimeline />
        </div>
    </>
}


const DefaultTimeline = () => {
    return (
        // <div className="w-[32rem]">
        <div className="w-full">
            <Timeline>
                <TimelineItem>
                    <TimelineConnector />
                    <TimelineHeader className="h-3">
                        <TimelineIcon />
                        <Typography variant="h6" color="blue-gray" className="leading-none">
                            Timeline Title Here.
                        </Typography>
                    </TimelineHeader>
                    {/* <TimelineBody className="w-8/12 sm:w-9/12 lg:w-11/12 xl:w-full pb-8"> */}
                    <TimelineBody className="pb-8">
                        <Typography variant="small" color="gray" className="font-normal text-gray-600">
                            The key to more success is to have a lot of pillows. Put it this way, it took me
                            twenty five years to get these plants, twenty five years of blood sweat and tears, and
                            I&apos;m never giving up, I&apos;m just getting started. I&apos;m up to something. Fan
                            luv.
                        </Typography>
                    </TimelineBody>
                </TimelineItem>
                <TimelineItem>
                    <TimelineConnector />
                    <TimelineHeader className="h-3">
                        <TimelineIcon />
                        <Typography variant="h6" color="blue-gray" className="leading-none">
                            Timeline Title Here.
                        </Typography>
                    </TimelineHeader>
                    <TimelineBody className="pb-8">
                        <Typography variant="small" color="gray" className="font-normal text-gray-600">
                            The key to more success is to have a lot of pillows. Put it this way, it took me
                            twenty five years to get these plants, twenty five years of blood sweat and tears, and
                            I&apos;m never giving up, I&apos;m just getting started. I&apos;m up to something. Fan
                            luv.
                        </Typography>
                    </TimelineBody>
                </TimelineItem>
                <TimelineItem>
                    <TimelineHeader className="h-3">
                        <TimelineIcon />
                        <Typography variant="h6" color="blue-gray" className="leading-none">
                            Timeline Title Here.
                        </Typography>
                    </TimelineHeader>
                    <TimelineBody>
                        <Typography variant="small" color="gray" className="font-normal text-gray-600">
                            The key to more success is to have a lot of pillows. Put it this way, it took me
                            twenty five years to get these plants, twenty five years of blood sweat and tears, and
                            I&apos;m never giving up, I&apos;m just getting started. I&apos;m up to something. Fan
                            luv.
                        </Typography>
                    </TimelineBody>
                </TimelineItem>
            </Timeline>
        </div>
    );
}