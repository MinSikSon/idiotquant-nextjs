"use client"

import { ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchPanel } from "@/components/panel/search";

const DefaultTopPanel = (props: any) => {
    return (
        <div className="flex justify-between">
            <Link className="" href="/">
                <div>idiotquant<span className='text-green-400'>.</span>com</div>
            </Link>
            {props.search ? <SearchPanel /> : <></>}
        </div>
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

const TopPanelSelector = (props: any) => {
    // console.log(`[TopPanelSelector] props.splitedPathname`, props.splitedPathname, props.splitedPathname.length);
    if (!!!props.splitedPathname) {
        return <DefaultTopPanel />;
    }
    if (`ticker` == props.splitedPathname[1]) {
        return <TickerTopPanel />;
    }
    if (`backtest` == props.splitedPathname[1] && 3 == props.splitedPathname.length) {
        return <BackTestTopPanel />;
    }
    if (`backtest` == props.splitedPathname[1]) {
        return <DefaultTopPanel search={false} />;
    }
    if (`search` == props.splitedPathname[1]) {
        return <DefaultTopPanel search={false} />;
    }
    return (<>
        <DefaultTopPanel search={true} />
    </>);
}

export const TopPanel = () => {
    const pathname = usePathname();
    const splitedPathname = pathname?.split("/");

    // console.log(`[TopPanel] pathname`, pathname);
    // console.log(`splitedPathname`, splitedPathname);

    return <>
        <div className="fixed top-0 z-40 w-full h-10">
            <div className='w-full bg-white text-xl pl-2 drop-shadow-md'>
                <TopPanelSelector splitedPathname={splitedPathname} />
            </div>
        </div>
    </>
}