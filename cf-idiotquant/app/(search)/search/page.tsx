"use client"

import SpotlightCard from "@/src/Components/SpotlightCard/SpotlightCard";
import { MagnifyingGlassCircleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

const DEBUG = false;

export default function Search() {
  return (
    <>
      <div className="flex flex-col dark:bg-black h-full dark:text-white">
        <div className="text-2xl flex items-center justify-left gap-2 p-6 sm:p-8 md:p-10 lg:p-12 ">
          <MagnifyingGlassCircleIcon className="h-5 w-5" strokeWidth={2} />
          <div>stock search</div>
        </div>
        <div className="grid grid-cols-2 items-center justify-center h-full p-6 gap-6 sm:p-8 sm:gap-8 md:p-10 md:gap-10 lg:p-12 lg:gap-12">
          <Link href="/search-kor">
            <SpotlightCard className="!bg-white dark:!bg-black dark:!border dark:!border-white shadow-md" spotlightColor="rgba(60, 130, 246, 0.5)">
              <div className="flex flex-col items-center justify-center text-black dark:text-white">
                <div className="text-2xl">
                  Korea
                </div>
                <div className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl">
                  (KOSPI/KOSDAQ/KONEX)
                </div>
              </div>
            </SpotlightCard>
          </Link>
          <Link href="/search-nasdaq">
            <SpotlightCard className="!bg-white dark:!bg-black dark:!border dark:!border-white shadow-md" spotlightColor="rgba(60, 130, 246, 0.5)">
              <div className="flex flex-col items-center justify-center text-black dark:text-white">
                <div className="text-2xl">
                  US
                </div>
                <div className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl">
                  (NASDAQ)
                </div>
              </div>
            </SpotlightCard>
          </Link>
        </div>
      </div>
      <div className="dark:bg-black h-lvh"></div>
    </>
  )
}
