"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Calculator, BarChart3 } from "lucide-react";
import { MdTableTemplate } from "./MdTableTemplate";
import { 
  calculateKrNcav, 
  calculateKrSRIM, 
  calculateUsNcav, 
  calculateUsSRIM 
} from "../../../../components/utils/financeCalc";
import { cn } from "@/lib/utils";

interface ValuationSectionProps {
  data: any;
  isUs: boolean;
}

export const ValuationSection = ({ data, isUs }: ValuationSectionProps) => {
  if (isUs) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <ValuationCard
          title="US NCAV 청산가치 전략"
          icon={<Calculator className="w-4 h-4 text-blue-500" />}
        >
          <MdTableTemplate content={calculateUsNcav(data.finnhubData, data.usDetail)} />
        </ValuationCard>

        <ValuationCard
          title="US S-RIM 적정주가 전략"
          icon={<BarChart3 className="w-4 h-4 text-emerald-500" />}
        >
          <MdTableTemplate content={calculateUsSRIM(data.finnhubData, data.usDetail)} />
        </ValuationCard>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <ValuationCard
        title="NCAV 청산가치 전략"
        icon={<Calculator className="w-4 h-4 text-blue-500" />}
        collapsible
      >
        <MdTableTemplate content={calculateKrNcav(data.kiBS, data.kiChart)} />
      </ValuationCard>

      <ValuationCard
        title="S-RIM 적정주가 전략"
        icon={<BarChart3 className="w-4 h-4 text-emerald-500" />}
        collapsible
      >
        <MdTableTemplate content={calculateKrSRIM(data.kiBS, data.kiIS, data.kiChart)} />
      </ValuationCard>
    </div>
  );
};

interface ValuationCardProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

function ValuationCard({ 
  title, 
  children, 
  icon, 
  collapsible = false, 
  defaultOpen = true 
}: ValuationCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden transition-all">
      {/* Header Area */}
      <div 
        className={cn(
          "flex items-center justify-between px-5 py-3.5 bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800",
          collapsible && "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        )}
        onClick={() => collapsible && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2.5">
          {icon && <div className="shrink-0">{icon}</div>}
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 tracking-tight">
            {title}
          </h3>
        </div>
        
        {collapsible && (
          <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Content Area with Animation */}
      <div 
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-5 text-sm text-zinc-600 dark:text-zinc-300">
          {children}
        </div>
      </div>
    </div>
  );
}