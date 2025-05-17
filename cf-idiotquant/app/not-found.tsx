"use client"

import { DesignButton } from "@/components/DesignButton";
import FuzzyText from "@/components/design/FuzzyText";
import { Button, Card, Typography } from "@material-tailwind/react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Not found",
}

export default function NotFound({ warnText = "Oops! Not Found!" }) {
    return <>
        <div className="flex justify-center items-center">
            <Card className={`border-2 border-gray-100 shadow-none`}>
                <Card.Header>
                    <div className="flex items-center justify-center text-xl">
                        <FuzzyText
                            baseIntensity={0.2}
                            hoverIntensity={0.5}
                            enableHover={true}
                            color="#000"
                        >
                            {warnText}
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
                                textStyle="font-mono text-white text-lg pt-0.5 font-bold"
                                buttonStyle="rounded-lg px-4 ml-2"
                            />
                        </Link>
                    </div>
                </Card.Body>
            </Card>
        </div>
    </>;
}

