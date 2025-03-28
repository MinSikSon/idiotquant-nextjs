"use client"

import React from "react";
import StrategyRegisterButton from "@/app/(strategy-register)/strategy-register/strategy_register_button";
import Strategy from "@/app/(strategy)/strategy/page";
import AlgorithmTrade from "../(algorithm-trade)/algorithm-trade/page";

export default function Home() {
  return <>
    {/* <StrategyRegisterButton />
    <Strategy /> */}
    <AlgorithmTrade />
  </>
}
