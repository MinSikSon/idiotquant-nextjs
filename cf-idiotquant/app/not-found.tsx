"use client"

import { Metadata } from "next";
import Link from "next/link";
import { Box, Text, Code, Button, Flex } from "@radix-ui/themes";

export const metadata: Metadata = {
    title: "Not found",
}

export default function NotFound({ warnText = "Oops! Not Found!" }) {
    return <>
        <Flex align="center" justify="center" gap="4">
            <Text size="5">
                <Code>{warnText} </Code>
            </Text>
            <Link href={`/`}>
                <Box>
                    <Button>return to the main page</Button>
                </Box>
            </Link>
        </Flex>
    </>;
}

