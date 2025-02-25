"use client"

import { Button, Card, CardBody, CardHeader, Typography } from "@material-tailwind/react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Not found",
}

export default function NotFound() {
    return <>
        <section className={`px-4`}>
            <Card shadow={false} className={`border-2 border-gray-100}`}>
                <CardHeader
                    shadow={false}
                    floated={false}
                    className="flex overflow-visible gap-y-4 flex-wrap items-start justify-between rounded-none"
                >
                    <div>
                        <Typography
                            color="blue-gray"
                            variant="h1"
                            className="!text-2xl"
                        >
                            Oops! Not Found!
                        </Typography>
                    </div>
                </CardHeader>
                <CardBody>
                    <Link href={`/`}>
                        <div
                            className='mb-2 px-2 button bg-green-400 rounded-full cursor-pointer select-none
                        active:translate-y-1 active:[box-shadow:0_0px_0_0_#129600,0_0px_0_0_#12960041] active:border-b-[0px]
                        transition-all duration-150 [box-shadow:0_4px_0_0_#129600,0_8px_0_0_#12960041] border-b-[1px] border-green-300
                      '>
                            <span className='flex flex-col justify-center items-center h-full text-white text-xs font-mono font-bold pt-0.5'>return to the main page</span>
                        </div>
                    </Link>
                </CardBody>
            </Card>
        </section>
    </>;
}

