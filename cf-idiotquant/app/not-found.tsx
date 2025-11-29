"use client"

import { Metadata } from "next";
import Link from "next/link";
import { Box, Text, Code, Button, Flex } from "@radix-ui/themes";

export const metadata: Metadata = {
    title: "Not found",
}

export default function NotFound({ warnText = "Oops! Not Found!" }) {
    return <>
        <Flex direction="column" align="center" justify="center" gap="4">
            <Text size="5">
                <Code>{warnText} </Code>
            </Text>
            <Link href={`/`}>
                <Button>return to the main page</Button>
            </Link>
        </Flex>
    </>;
}

