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
                        <Button>
                            return to the main page
                        </Button>
                    </Link>
                </CardBody>
            </Card>
        </section>
    </>;
}

