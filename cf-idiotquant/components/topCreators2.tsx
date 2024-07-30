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
import { escapeSpecialCharacters } from "./util";
import Link from "next/link";

export interface Web3CardPropsType {
    name: string;
    desc: string;
    imgs: string;
    cardNum: string;
    profileImg: string;
    summary: string;

    detail?: any[];
}

function Web3Card({
    parentRouter,
    name,
    desc,
    imgs,
    cardNum,
    profileImg,
    summary,
}: Web3CardPropsType & { parentRouter: string }) {
    // console.log(`[Web3Card] imgs`, imgs);
    const url: string = imgs;
    // console.log(`url`, url);

    // console.log(`cardNum`, cardNum);
    return (
        <Link href={`/${parentRouter}/${Number(cardNum)}`}>
            <Card className="border border-gray-300 overflow-hidden shadow-sm">
                <CardBody className={`px-4 pt-4 pb-32 xl:pt-8 xl:pb-64 bg-cover bg-center`}>
                    <div className="absolute top-0 left-0 h-48 xl:h-80 w-full bg-cover bg-center rounded-xl" style={{ backgroundImage: `url('${url}')` }}></div>
                    <div className={`flex items-start justify-between`}>
                        <Typography color="white"
                            className="!text-base !font-semibold mb-1"
                        >
                            {cardNum}
                        </Typography>
                        <Button color="black" size="sm" variant="outlined" className="border-gray-300 bg-white/70 p-1">
                            see collection
                        </Button>
                    </div>
                    <div className="my-4 flex items-start justify-between">
                        <div className="absolute top-40 xl:top-72 flex items-center gap-2 bg-white/70 p-1 rounded-full border border-gray-200 ">
                            <Avatar size="sm" src={profileImg} alt={name} />
                            <div className="pr-4">
                                <Typography color="black" variant="h6">
                                    {name}
                                </Typography>
                                <Typography
                                    color="gray"
                                    variant="small"
                                    className="font-medium"
                                >
                                    {desc}
                                </Typography>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {/* {imgs.map((img, key) => (
                        <img
                            key={key}
                            src={img}
                            className="h-full w-full object-cover rounded-xl"
                            alt="name"
                        />
                    ))} */}
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

// const data: Web3Card2DataType[] = [
//     {
//         cardNum: "#1",
//         profileImg: "https://www.material-tailwind.com/img/avatar1.jpg",
//         name: "Tina Andrew",
//         desc: "Creator",
//         imgs: [
//             "bg-[url('https://www.material-tailwind.com/img/avatar1.jpg')]",
//             "https://upload.wikimedia.org/wikipedia/commons/2/2a/Benjamin_Graham_%281894-1976%29_portrait_on_23_March_1950.jpg",
//             "https://upload.wikimedia.org/wikipedia/commons/5/51/Warren_Buffett_KU_Visit.jpg",
//             // "/image/web3-card-1.svg",
//             // "/image/web3-card-2.svg",
//             // "/image/web3-card-3.svg",
//         ],
//         summary: "뭘까요?",
//     },
//     {
//         cardNum: "#2",
//         profileImg: "https://www.material-tailwind.com/image/avatar2.jpg",
//         name: "Linde Michael",
//         desc: "Creator",
//         imgs: [
//             "bg-[url('https://www.syesd.co.kr/homepage/syStoryImageFolder/1614817264026_fb8ff05cd5914f31981ff8aab95f8219_01.png')]",
//             "https://www.syesd.co.kr/homepage/syStoryImageFolder/1614817264026_fb8ff05cd5914f31981ff8aab95f8219_01.png",
//             "https://www.syesd.co.kr/homepage/syStoryImageFolder/1614817264026_fb8ff05cd5914f31981ff8aab95f8219_01.png",
//             // "/image/web3-card-5-mini.svg",
//             // "/image/web3-card-6-mini.svg",
//             // "/image/web3-card-7-mini.svg",
//         ],
//         summary: "뭘까유유",
//     },
//     {
//         cardNum: "#3",
//         profileImg: "https://www.material-tailwind.com/image/avatar7.svg",
//         name: "Misha Stam",
//         desc: "Creator",
//         imgs: [
//             "bg-[url('https://upload.wikimedia.org/wikipedia/commons/5/51/Warren_Buffett_KU_Visit.jpg')]",
//             "https://www.syesd.co.kr/homepage/syStoryImageFolder/1614817264026_fb8ff05cd5914f31981ff8aab95f8219_01.png",
//             "https://upload.wikimedia.org/wikipedia/commons/2/2a/Benjamin_Graham_%281894-1976%29_portrait_on_23_March_1950.jpg",
//             // "/image/web3-card-4.svg",
//             // "/image/web3-card-4.svg",
//             // "/image/web3-card-4.svg",
//         ],
//         summary: "뭘까요호우",
//     },
//     {
//         cardNum: "#1",
//         profileImg: "https://www.material-tailwind.com/img/avatar1.jpg",
//         name: "Tina Andrew",
//         desc: "Creator",
//         imgs: [
//             "bg-[url('https://www.material-tailwind.com/img/avatar1.jpg')]",
//             "https://upload.wikimedia.org/wikipedia/commons/2/2a/Benjamin_Graham_%281894-1976%29_portrait_on_23_March_1950.jpg",
//             "https://upload.wikimedia.org/wikipedia/commons/5/51/Warren_Buffett_KU_Visit.jpg",
//             // "/image/web3-card-1.svg",
//             // "/image/web3-card-2.svg",
//             // "/image/web3-card-3.svg",
//         ],
//         summary: "뭘까요?",
//     },
// ];

export function Web3Card2({
    title,
    parentRouter,
    data
}: { title: string, parentRouter: string, data: Web3CardPropsType[] }) {
    // console.log(`[Web3Card2] data`, data);

    return (
        <section className="px-4 py-4">
            <Card shadow={false} className="border border-gray-300">
                <CardHeader
                    shadow={false}
                    floated={false}
                    className="flex overflow-visible gap-y-4 flex-wrap items-start justify-between rounded-none"
                >
                    <div>
                        <Typography
                            color="blue-gray"
                            variant="h1"
                            className="!text-2xl mb-1"
                        >
                            {title}
                        </Typography>
                        {/* <Typography
                            color="blue-gray"
                            className="!text-lg font-normal text-gray-600"
                        >
                            The most sought-after collections across the entire ecosystem.
                        </Typography> */}
                    </div>
                    {/* <div className="flex shrink-0 gap-2">
                        <Button size="sm" variant="outlined" className="border-gray-300">
                            Last 24h
                        </Button>
                        <Button size="sm" variant="outlined" className="border-gray-300">
                            Last week
                        </Button>
                        <Button size="sm" variant="outlined">
                            Last month
                        </Button>
                    </div> */}
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