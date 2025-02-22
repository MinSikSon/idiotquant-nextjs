import React from "react";

// @material-tailwind-react
import {
    Card,
    Avatar,
    Button,
    CardBody,
    CardHeader,
    Typography,
    CardFooter,
} from "@material-tailwind/react";
import Link from "next/link";

export interface Web3CardPropsType {
    title: any;
    subTitle: any;
    imgs: string;
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
    const url: string = imgs;
    return (
        <Link href={`/${parentRouter}/${Number(cardNum)}`}>
            <Card className="border border-gray-300 overflow-hidden shadow-sm">
                <CardBody className={`px-4 pt-4 pb-32 xl:pt-8 xl:pb-64 bg-cover bg-center`}>
                    <div className="absolute top-0 left-0 h-48 xl:h-80 w-full bg-cover bg-center" style={{ backgroundImage: `url('${url}')` }}></div>
                    <div className={`flex items-start justify-between`}>
                        <Typography color="white"
                            className="!text-base !font-semibold mb-1"
                        >
                            {cardNum}
                        </Typography>
                        <Button className="z-10 border-gray-300 bg-white/70 p-1" color="black" size="sm" variant="outlined">
                            click to view
                        </Button>
                    </div>
                    <div className="my-4 flex items-start justify-between">
                        <div className="absolute top-40 left-2 xl:top-72 flex items-center gap-2 bg-white/70 p-1 rounded-xl border-2 border-gray-200 ">
                            <Avatar size="sm" src={profileImg} alt={title} />
                            <div className="pr-4">
                                <Typography color="black" variant="h6">
                                    {title}
                                </Typography>
                                <Typography
                                    color="gray"
                                    variant="small"
                                    className="font-medium"
                                >
                                    {subTitle}
                                </Typography>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                    </div>
                </CardBody>
                <CardFooter className="">
                    <Typography
                        color="black"
                        variant="small"
                        className="font-medium">
                        {summary}
                    </Typography>
                </CardFooter>
            </Card>
        </Link>
    );
}

export function Web3Card2({
    title,
    parentRouter,
    data
}: { title: string, parentRouter: string, data: Web3CardPropsType[] }) {
    return (
        <section className="px-4 py-4">
            <Card shadow={false} className="border border-gray-300">
                <CardHeader
                    shadow={false}
                    floated={false}
                    className="flex overflow-visible gap-y-4 flex-wrap items-start justify-between rounded-none"
                >
                    <div className="font-bold text-2xl mb-1">
                        {title}
                    </div>
                </CardHeader>
                <CardBody className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-4">
                    {data.map((props, key) => (
                        <Web3Card key={key} parentRouter={parentRouter} {...props} />
                    ))}
                </CardBody>
            </Card>
        </section>
    );
}