"use client"

import React from "react";
import StrategyRegisterButton from "@/app/(strategy_register)/strategy_register/strategy_register_button";
import Strategy from "@/app/(strategy)/strategy/page";

export default function Home() {
  return <>
    <StrategyRegisterButton />
    <Strategy />
  </>
}
