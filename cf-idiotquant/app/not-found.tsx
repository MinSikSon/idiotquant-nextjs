"use client"

import { DesignButton } from "@/components/designButton";
import FuzzyText from "@/components/design/FuzzyText";
import { Button, Card, Typography } from "@material-tailwind/react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Not found",
}

export default function NotFound() {
    return <>
        <section className={`px-4`}>
            <Card className={`border-2 border-gray-100 shadow-none`}>
                <Card.Header>
                    <div className="flex items-center justify-center text-xl">
                        <FuzzyText
                            baseIntensity={0.2}
                            hoverIntensity={0.5}
                            enableHover={true}
                            color="#000"
                        >
                            Oops! Not Found!
                        </FuzzyText>
                    </div>
                </Card.Header>
                <Card.Body>
                    <div className="mx-6">
                        <Link href={`/`}>
                            <DesignButton
                                handleOnClick={() => { }}
                                buttonName="return to the main page"
                                buttonBgColor="bg-green-500"
                                buttonBorderColor="border-green-400"
                                buttonShadowColor="#129600"
                                textStyle="text-white text-xs pt-0.5 font-bold"
                                buttonStyle="rounded-lg px-4 ml-2"
                            />
                        </Link>
                    </div>
                </Card.Body>
            </Card>
        </section>
    </>;
}

