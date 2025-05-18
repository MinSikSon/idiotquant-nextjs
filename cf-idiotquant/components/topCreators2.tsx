import React from "react";

// @material-tailwind-react
import {
    Card,
    Avatar,
    Button,
} from "@material-tailwind/react";
import Link from "next/link";
import { DesignButton } from "./DesignButton";

export interface Web3CardPropsType {
    title: any;
    subTitle: any;
    imgs?: string;
    cardNum: string;
    profileImg: string;
    summary: string;

    detail?: any[];
}

function Web3Card({
    parentRouter,
    title,
    subTitle,
    imgs,
    cardNum,
    profileImg,
    summary,
}: Web3CardPropsType & { parentRouter: string }) {
    // const url: string = imgs;
    return (
        <Link href={`/${parentRouter}/${Number(cardNum)}`}>
            <>
                <DesignButton
                    handleOnClick={() => { }}
                    buttonName={<>
                        <Card className="overflow-hidden shadow-sm">
                            <Card.Body className="bg-cover bg-center p-1 flex">
                                {/* <div className="absolute top-0 left-0 w-full h-48 xl:h-80 bg-cover bg-center" style={{ backgroundImage: `url('${url}')` }} /> */}
                                {/* <Avatar className="shrink-0 object-cover border border-black" size="sm" src={profileImg} alt={title} /> */}
                                <div className="shrink-0 object-cover">
                                    <Avatar shape="circular" size="xl" src={profileImg} alt={title} className="border border-black shadow" />
                                </div>
                                <div className="flex items-center">
                                    <div className={`z-10 flex flex-col items-start justify-between pl-1`}>
                                        <div className="font-mono text-black text-xs mb-1">
                                            [{cardNum}] click to view
                                        </div>
                                        <div className="font-mono text-black text-xs pl-1">
                                            <div className={`${String(title).length > 12 ? "text-xs xl:text-xs" : ""}`}>
                                                <div>{title}</div>
                                                <div>{subTitle}</div>
                                                <div className="text-[0.6rem] pl-2 pr-2">{summary}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </>}
                    buttonBgColor="bg-white"
                    buttonBorderColor="border-gray-300"
                    buttonShadowColor="#D5D5D5"
                    // textStyle="text-white text-xs font-bold"
                    textStyle="font-mono text-black text-xs"
                    buttonStyle={`rounded-xl flex items-center justify-center mb-2 button bg-white cursor-pointer select-none
                                            active:translate-y-1 active:[box-shadow:0_0px_0_0_#D5D5D5,0_0px_0_0_#D5D5D541] active:border-[0px]
                                            transition-all duration-150 [box-shadow:0_4px_0_0_#D5D5D5,0_8px_0_0_#D5D5D541] border-[1px]
                                            `}
                />
            </>
        </Link>
    );
}

export function Web3Card2({
    title,
    parentRouter,
    data
}: { title: string, parentRouter: string, data: Web3CardPropsType[] }) {
    return (
        <section className="px-2 py-2">
            <Card className="border border-gray-300 overflow-hidden shadow-sm">
                <Card.Header className="flex overflow-visible gap-y-4 flex-wrap items-start justify-between shadow-none">
                    <div className="font-mono text-black mb-1">
                        {title}
                    </div>
                </Card.Header>
                <Card.Body className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-4">
                    {data.map((props, key) => (
                        <Web3Card key={key} parentRouter={parentRouter} {...props} />
                    ))}
                </Card.Body>
            </Card>
        </section>
    );
}