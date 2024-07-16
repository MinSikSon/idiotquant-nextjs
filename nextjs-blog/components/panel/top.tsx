"use client"

import { ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";

const DefaultTopPanel = () => {
    return (
        <Link href="/">
            <div>idiot<span className='text-green-400'>.</span>quant</div>
        </Link>
    );
}

const TickerTopPanel = () => {
    return (
        <Link href="/">
            <ArrowUturnLeftIcon className="h-6 w-6" />
        </Link>
    );
}

const BackTestTopPanel = () => {
    return (
        <Link href="/backtest">
            <ArrowUturnLeftIcon className="h-6 w-6" />
        </Link>
    );
}

const TopPanelSelector = (props) => {
    // console.log(`[TopPanelSelector] props.splitedPathname`, props.splitedPathname, props.splitedPathname.length);
    if (!!!props.splitedPathname) {
        return <DefaultTopPanel />;
    }
    if (`ticker` == props.splitedPathname[1]) {
        return <TickerTopPanel />;
    }
    if (`backtest` == props.splitedPathname[1] && 3 == props.splitedPathname.length) {
        return <BackTestTopPanel />
    }
    return (<>
        <DefaultTopPanel />
    </>)
}

export const TopPanel = () => {
    const pathname = usePathname();
    const splitedPathname = pathname?.split("/");

    // console.log(`[TopPanel] pathname`, pathname);
    // console.log(`splitedPathname`, splitedPathname);

    return <>
        <div className="fixed top-0 z-40 w-full">
            <div className='w-full bg-white text-xl pl-2 drop-shadow-md'>
                <TopPanelSelector splitedPathname={splitedPathname} />
            </div>
        </div>
    </>
}